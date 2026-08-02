import { Router } from 'express';
import stripe from '../config/stripe.js';
import User from '../models/User.js';
import requireAuth from '../middleware/requireAuth.js';
import logger from '../config/logger.js';
import express from 'express';
import { sendPaymentReceiptEmail, sendPaymentFailedEmail, sendSubscriptionCancelledEmail } from '../services/emailService.js';
import asyncHandler from '../utils/asyncHandler.js';
import { claimEvent, releaseEvent } from '../utils/eventIdempotency.js';

const router = Router();

/**
 * True only when the user already holds an active subscription. Used to block a
 * second checkout (double-billing); a past_due/canceled/none user may still
 * check out to (re)subscribe.
 */
export function hasActiveSubscription(user) {
  return user?.subscriptionStatus === 'active';
}

/**
 * Map a Stripe subscription object to our User.subscriptionStatus enum
 * ('none' | 'active' | 'past_due' | 'canceled').
 *
 * trialing → active: a paid trial IS entitled access — every access check in
 * the app (requireSubscription, hasFullAccess, client gates) honors only
 * 'active', so mapping trialing anywhere else locks a paying trial user out.
 * unpaid → past_due (retries exhausted but the subscription still exists).
 * An active/trialing status wins over cancel_at_period_end — the user keeps
 * access until the period ends; customer.subscription.deleted sets 'none'.
 */
export function mapSubscriptionStatus(sub) {
  if (sub.status === 'active' || sub.status === 'trialing') return 'active';
  if (sub.status === 'past_due' || sub.status === 'unpaid') return 'past_due';
  return sub.cancel_at_period_end ? 'canceled' : 'none';
}

/**
 * Resolve the app user a webhook event belongs to. metadata.userId is only
 * stamped by our own checkout flow — a subscription created from the Stripe
 * dashboard, or recreated by the Customer Portal without carrying metadata
 * forward, arrives without it. Fall back to the indexed stripeCustomerId
 * lookup so those events still provision the right account instead of being
 * silently dropped (customer pays, never gets access, nothing logged).
 */
export async function resolveWebhookUserId(metadataUserId, customerId) {
  if (metadataUserId) return metadataUserId;
  if (!customerId) return null;
  const user = await User.findOne({ stripeCustomerId: customerId }).select('_id').lean();
  return user ? user._id : null;
}

// ── Create Checkout Session ──────────────────────────────────
router.post('/api/billing/create-checkout-session', requireAuth, asyncHandler(async (req, res) => {
  if (!stripe) return res.status(503).json({ error: 'Billing not configured' });

  const user = await User.findById(req.session.userId);
  if (!user) return res.status(401).json({ error: 'User not found' });

  // Don't let an already-active subscriber start a second subscription.
  if (hasActiveSubscription(user)) {
    return res.status(400).json({ error: 'You already have an active subscription' });
  }

  // Create or reuse Stripe customer
  let customerId = user.stripeCustomerId;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      metadata: { userId: user._id.toString() },
    });
    customerId = customer.id;
    user.stripeCustomerId = customerId;
    await user.save();
  }

  const appUrl = process.env.APP_URL || 'http://localhost:5173';

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    line_items: [{
      price: process.env.STRIPE_PRICE_ID_MONTHLY,
      quantity: 1,
    }],
    success_url: `${appUrl}/dashboard?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${appUrl}/pricing`,
    subscription_data: {
      metadata: { userId: user._id.toString() },
    },
  });

  res.json({ url: session.url });
}));

// ── Create Customer Portal Session ───────────────────────────
router.post('/api/billing/create-portal-session', requireAuth, asyncHandler(async (req, res) => {
  if (!stripe) return res.status(503).json({ error: 'Billing not configured' });

  const user = await User.findById(req.session.userId);
  if (!user?.stripeCustomerId) {
    return res.status(400).json({ error: 'No billing account found' });
  }

  const appUrl = process.env.APP_URL || 'http://localhost:5173';

  const session = await stripe.billingPortal.sessions.create({
    customer: user.stripeCustomerId,
    return_url: `${appUrl}/settings`,
  });

  res.json({ url: session.url });
}));

// ── Subscription Status ──────────────────────────────────────
router.get('/api/billing/status', requireAuth, asyncHandler(async (req, res) => {
  const user = await User.findById(req.session.userId)
    .select('subscriptionStatus subscriptionId currentPeriodEnd role');

  if (!user) return res.status(401).json({ error: 'User not found' });

  res.json({
    subscriptionStatus: user.subscriptionStatus,
    currentPeriodEnd: user.currentPeriodEnd,
    isActive: user.subscriptionStatus === 'active' || user.role === 'owner',
  });
}));

// ── Stripe Webhook ───────────────────────────────────────────
// NOTE: This needs raw body, so it's mounted before express.json()
// in app.js. We export it separately.
export const webhookRouter = Router();

webhookRouter.post('/api/billing/webhook',
  express.raw({ type: 'application/json' }),
  async (req, res) => {
    if (!stripe) return res.status(503).send('Billing not configured');

    const sig = req.headers['stripe-signature'];
    let event;

    try {
      event = stripe.webhooks.constructEvent(
        req.body,
        sig,
        process.env.STRIPE_WEBHOOK_SECRET
      );
    } catch (err) {
      logger.error({ err: err.message }, 'Webhook signature verification failed');
      return res.status(400).send('Webhook signature verification failed');
    }

    // Idempotency check (atomic claim to prevent race conditions)
    const claimed = await claimEvent(event.id);
    if (!claimed) {
      logger.info({ eventId: event.id }, 'Duplicate webhook event, skipping');
      return res.json({ received: true, duplicate: true });
    }

    try {
      switch (event.type) {
        case 'checkout.session.completed': {
          const session = event.data.object;
          if (session.mode === 'subscription') {
            const metadataUserId = session.subscription
              ? (await stripe.subscriptions.retrieve(session.subscription)).metadata?.userId
              : null;
            const userId = await resolveWebhookUserId(metadataUserId, session.customer);

            if (userId) {
              await User.findByIdAndUpdate(userId, {
                stripeCustomerId: session.customer,
                subscriptionId: session.subscription,
                subscriptionStatus: 'active',
              });
              logger.info({ userId }, 'Subscription activated via checkout');
            } else {
              logger.warn({ eventId: event.id, eventType: event.type, customerId: session.customer }, 'webhook: could not resolve user');
            }
          }
          break;
        }

        case 'invoice.paid': {
          const invoice = event.data.object;
          if (invoice.subscription) {
            const sub = await stripe.subscriptions.retrieve(invoice.subscription);
            const userId = await resolveWebhookUserId(sub.metadata?.userId, invoice.customer);
            if (userId) {
              const paidUser = await User.findByIdAndUpdate(userId, {
                subscriptionStatus: 'active',
                currentPeriodEnd: new Date(sub.current_period_end * 1000),
              }, { new: true });
              if (paidUser) {
                sendPaymentReceiptEmail(paidUser.email, paidUser.displayName, invoice.amount_paid, invoice.currency).catch(() => {});
              }
            } else {
              logger.warn({ eventId: event.id, eventType: event.type, customerId: invoice.customer }, 'webhook: could not resolve user');
            }
          }
          break;
        }

        case 'invoice.payment_failed': {
          const invoice = event.data.object;
          if (invoice.subscription) {
            const sub = await stripe.subscriptions.retrieve(invoice.subscription);
            const userId = await resolveWebhookUserId(sub.metadata?.userId, invoice.customer);
            if (userId) {
              const failedUser = await User.findByIdAndUpdate(userId, {
                subscriptionStatus: 'past_due',
              }, { new: true });
              if (failedUser) {
                sendPaymentFailedEmail(failedUser.email, failedUser.displayName).catch(() => {});
              }
              logger.warn({ userId }, 'Subscription payment failed');
            } else {
              logger.warn({ eventId: event.id, eventType: event.type, customerId: invoice.customer }, 'webhook: could not resolve user');
            }
          }
          break;
        }

        case 'customer.subscription.updated': {
          const sub = event.data.object;
          const userId = await resolveWebhookUserId(sub.metadata?.userId, sub.customer);
          if (userId) {
            const status = mapSubscriptionStatus(sub);

            await User.findByIdAndUpdate(userId, {
              subscriptionStatus: status,
              subscriptionId: sub.id,
              currentPeriodEnd: new Date(sub.current_period_end * 1000),
            });
            logger.info({ userId, status }, 'Subscription updated');
          } else {
            logger.warn({ eventId: event.id, eventType: event.type, customerId: sub.customer }, 'webhook: could not resolve user');
          }
          break;
        }

        case 'customer.subscription.deleted': {
          const sub = event.data.object;
          const userId = await resolveWebhookUserId(sub.metadata?.userId, sub.customer);
          if (userId) {
            const cancelledUser = await User.findByIdAndUpdate(userId, {
              subscriptionStatus: 'none',
              subscriptionId: null,
              currentPeriodEnd: null,
            }, { new: true });
            if (cancelledUser) {
              sendSubscriptionCancelledEmail(cancelledUser.email, cancelledUser.displayName).catch(() => {});
            }
            logger.info({ userId }, 'Subscription canceled');
          } else {
            logger.warn({ eventId: event.id, eventType: event.type, customerId: sub.customer }, 'webhook: could not resolve user');
          }
          break;
        }

        default:
          logger.debug({ type: event.type }, 'Unhandled webhook event');
      }

      res.json({ received: true });
    } catch (err) {
      // Release the idempotency claim so Stripe's retry can reprocess this event,
      // instead of the poisoned record making every retry look like a duplicate.
      await releaseEvent(event.id);
      logger.error({ err, eventType: event.type }, 'Webhook handler error');
      res.status(500).json({ error: 'Webhook handler failed' });
    }
  }
);

export default router;

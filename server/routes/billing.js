import { Router } from 'express';
import stripe from '../config/stripe.js';
import User from '../models/User.js';
import ProcessedEvent from '../models/ProcessedEvent.js';
import requireAuth from '../middleware/requireAuth.js';
import logger from '../config/logger.js';
import express from 'express';
import { sendPaymentReceiptEmail, sendPaymentFailedEmail, sendSubscriptionCancelledEmail } from '../services/emailService.js';

const router = Router();

// ── Create Checkout Session ──────────────────────────────────
router.post('/api/billing/create-checkout-session', requireAuth, async (req, res) => {
  if (!stripe) return res.status(503).json({ error: 'Billing not configured' });

  try {
    const user = await User.findById(req.session.userId);
    if (!user) return res.status(401).json({ error: 'User not found' });

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
  } catch (err) {
    logger.error({ err }, 'Failed to create checkout session');
    res.status(500).json({ error: 'Failed to create checkout session' });
  }
});

// ── Create Customer Portal Session ───────────────────────────
router.post('/api/billing/create-portal-session', requireAuth, async (req, res) => {
  if (!stripe) return res.status(503).json({ error: 'Billing not configured' });

  try {
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
  } catch (err) {
    logger.error({ err }, 'Failed to create portal session');
    res.status(500).json({ error: 'Failed to create portal session' });
  }
});

// ── Subscription Status ──────────────────────────────────────
router.get('/api/billing/status', requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.session.userId)
      .select('subscriptionStatus subscriptionId currentPeriodEnd role');

    if (!user) return res.status(401).json({ error: 'User not found' });

    res.json({
      subscriptionStatus: user.subscriptionStatus,
      currentPeriodEnd: user.currentPeriodEnd,
      isActive: user.subscriptionStatus === 'active' || user.role === 'admin',
    });
  } catch (err) {
    logger.error({ err }, 'Failed to get billing status');
    res.status(500).json({ error: 'Failed to get billing status' });
  }
});

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
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Idempotency check
    const existing = await ProcessedEvent.findOne({ eventId: event.id });
    if (existing) {
      return res.json({ received: true, duplicate: true });
    }

    try {
      switch (event.type) {
        case 'checkout.session.completed': {
          const session = event.data.object;
          if (session.mode === 'subscription') {
            const userId = session.subscription
              ? (await stripe.subscriptions.retrieve(session.subscription)).metadata.userId
              : null;

            if (userId) {
              await User.findByIdAndUpdate(userId, {
                stripeCustomerId: session.customer,
                subscriptionId: session.subscription,
                subscriptionStatus: 'active',
              });
              logger.info({ userId }, 'Subscription activated via checkout');
            }
          }
          break;
        }

        case 'invoice.paid': {
          const invoice = event.data.object;
          if (invoice.subscription) {
            const sub = await stripe.subscriptions.retrieve(invoice.subscription);
            const userId = sub.metadata.userId;
            if (userId) {
              const paidUser = await User.findByIdAndUpdate(userId, {
                subscriptionStatus: 'active',
                currentPeriodEnd: new Date(sub.current_period_end * 1000),
              }, { new: true });
              if (paidUser) {
                sendPaymentReceiptEmail(paidUser.email, paidUser.displayName, invoice.amount_paid, invoice.currency).catch(() => {});
              }
            }
          }
          break;
        }

        case 'invoice.payment_failed': {
          const invoice = event.data.object;
          if (invoice.subscription) {
            const sub = await stripe.subscriptions.retrieve(invoice.subscription);
            const userId = sub.metadata.userId;
            if (userId) {
              const failedUser = await User.findByIdAndUpdate(userId, {
                subscriptionStatus: 'past_due',
              }, { new: true });
              if (failedUser) {
                sendPaymentFailedEmail(failedUser.email, failedUser.displayName).catch(() => {});
              }
              logger.warn({ userId }, 'Subscription payment failed');
            }
          }
          break;
        }

        case 'customer.subscription.updated': {
          const sub = event.data.object;
          const userId = sub.metadata.userId;
          if (userId) {
            const status = sub.status === 'active' ? 'active'
              : sub.status === 'past_due' ? 'past_due'
              : sub.cancel_at_period_end ? 'canceled'
              : 'none';

            await User.findByIdAndUpdate(userId, {
              subscriptionStatus: status,
              subscriptionId: sub.id,
              currentPeriodEnd: new Date(sub.current_period_end * 1000),
            });
            logger.info({ userId, status }, 'Subscription updated');
          }
          break;
        }

        case 'customer.subscription.deleted': {
          const sub = event.data.object;
          const userId = sub.metadata.userId;
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
          }
          break;
        }

        default:
          logger.debug({ type: event.type }, 'Unhandled webhook event');
      }

      await ProcessedEvent.create({ eventId: event.id });
      res.json({ received: true });
    } catch (err) {
      logger.error({ err, eventType: event.type }, 'Webhook handler error');
      res.status(500).json({ error: 'Webhook handler failed' });
    }
  }
);

export default router;

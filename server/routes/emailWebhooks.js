import { Router } from 'express';
import express from 'express';
import logger from '../config/logger.js';
import User from '../models/User.js';
import { verifyResendSignature, classifyEvent } from '../services/resendWebhook.js';

// NOTE: This router needs raw body access for HMAC verification, so it's
// mounted before express.json() in app.js (same pattern as the Stripe webhook).
export const emailWebhookRouter = Router();

emailWebhookRouter.post(
  '/api/email/webhook',
  express.raw({ type: 'application/json' }),
  async (req, res) => {
    const secret = process.env.RESEND_WEBHOOK_SECRET;
    if (!secret) {
      logger.warn('Resend webhook received but RESEND_WEBHOOK_SECRET is not configured');
      return res.status(503).json({ error: 'Webhook not configured' });
    }

    const verified = verifyResendSignature({
      headers: req.headers,
      rawBody: req.body,
      secret,
    });
    if (!verified) {
      logger.warn({ svixId: req.headers['svix-id'] }, 'Resend webhook signature verification failed');
      return res.status(400).json({ error: 'Invalid signature' });
    }

    let event;
    try {
      event = JSON.parse(req.body.toString('utf8'));
    } catch {
      return res.status(400).json({ error: 'Invalid JSON' });
    }

    const classified = classifyEvent(event);
    if (classified.kind === 'ignore') {
      return res.json({ received: true, handled: false });
    }
    if (!classified.email) {
      logger.warn({ type: event.type }, 'Resend webhook event missing email');
      return res.json({ received: true, handled: false });
    }

    const update = classified.kind === 'bounce'
      ? { emailBounced: true }
      : { emailSuppressed: true };

    const result = await User.findOneAndUpdate(
      { email: classified.email.toLowerCase() },
      update,
      { new: true },
    );
    if (result) {
      logger.info({ userId: result._id, email: classified.email, kind: classified.kind }, 'Email flag set from Resend webhook');
    } else {
      logger.info({ email: classified.email, kind: classified.kind }, 'Resend webhook for unknown user — ignored');
    }

    return res.json({ received: true, handled: true });
  },
);

export default emailWebhookRouter;

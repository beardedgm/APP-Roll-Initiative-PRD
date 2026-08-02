import { describe, it, expect, beforeAll, afterEach, afterAll } from 'vitest';
import { startMemoryDb, clearMemoryDb, stopMemoryDb } from '../helpers/memoryDb.js';
import User from '../../models/User.js';
import { mapSubscriptionStatus, resolveWebhookUserId } from '../../routes/billing.js';

// M1: every access check in the app honors ONLY subscriptionStatus === 'active'
// (requireSubscription, hasFullAccess, all client gates), so a Stripe status
// that maps anywhere else revokes access. `trialing` is a paying customer
// inside a valid trial — it must map to 'active', not fall through to 'none'.
describe('mapSubscriptionStatus', () => {
  const cases = [
    [{ status: 'active', cancel_at_period_end: false }, 'active'],
    // active + pending cancellation keeps access until the period ends;
    // customer.subscription.deleted flips to 'none' at that point.
    [{ status: 'active', cancel_at_period_end: true }, 'active'],
    [{ status: 'trialing', cancel_at_period_end: false }, 'active'],
    [{ status: 'trialing', cancel_at_period_end: true }, 'active'],
    [{ status: 'past_due', cancel_at_period_end: false }, 'past_due'],
    [{ status: 'unpaid', cancel_at_period_end: false }, 'past_due'],
    [{ status: 'canceled', cancel_at_period_end: true }, 'canceled'],
    [{ status: 'incomplete', cancel_at_period_end: false }, 'none'],
    [{ status: 'incomplete_expired', cancel_at_period_end: false }, 'none'],
  ];

  it.each(cases)('maps %o to %s', (sub, expected) => {
    expect(mapSubscriptionStatus(sub)).toBe(expected);
  });
});

// M2: metadata.userId is only stamped by our own checkout flow. A subscription
// created from the Stripe dashboard (or recreated by the Customer Portal
// without carrying metadata) must still resolve via the indexed
// stripeCustomerId lookup, or the customer pays and never gets provisioned.
describe('resolveWebhookUserId', () => {
  beforeAll(startMemoryDb);
  afterEach(clearMemoryDb);
  afterAll(stopMemoryDb);

  it('prefers metadata userId when present', async () => {
    expect(await resolveWebhookUserId('user123', 'cus_abc')).toBe('user123');
  });

  it('falls back to the stripeCustomerId lookup', async () => {
    const user = await User.create({
      email: 'dm@example.com',
      hashedPassword: 'hash',
      salt: 'salt',
      displayName: 'DM',
      stripeCustomerId: 'cus_abc',
    });
    const resolved = await resolveWebhookUserId(null, 'cus_abc');
    expect(String(resolved)).toBe(String(user._id));
  });

  it('returns null when neither resolves', async () => {
    expect(await resolveWebhookUserId(null, 'cus_unknown')).toBeNull();
    expect(await resolveWebhookUserId(null, null)).toBeNull();
  });
});

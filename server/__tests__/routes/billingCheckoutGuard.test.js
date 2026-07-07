import { describe, it, expect } from 'vitest';
import { hasActiveSubscription } from '../../routes/billing.js';

// create-checkout-session must refuse to start a second subscription for a user
// who is already active (prevents double-billing). A past_due user, however,
// should still be able to re-run checkout to recover, so only 'active' blocks.
describe('hasActiveSubscription', () => {
  it('is true only for an active subscription', () => {
    expect(hasActiveSubscription({ subscriptionStatus: 'active' })).toBe(true);
  });

  it('is false for past_due so the user can retry checkout to recover', () => {
    expect(hasActiveSubscription({ subscriptionStatus: 'past_due' })).toBe(false);
  });

  it('is false for none, canceled, or a missing user', () => {
    expect(hasActiveSubscription({ subscriptionStatus: 'none' })).toBe(false);
    expect(hasActiveSubscription({ subscriptionStatus: 'canceled' })).toBe(false);
    expect(hasActiveSubscription(null)).toBe(false);
    expect(hasActiveSubscription(undefined)).toBe(false);
  });
});

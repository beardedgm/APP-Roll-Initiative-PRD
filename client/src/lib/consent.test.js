import { describe, it, expect, beforeEach } from 'vitest';
import { getConsent, setConsent, CONSENT_ACCEPTED, CONSENT_DECLINED } from './consent';

beforeEach(() => localStorage.clear());

// n2: analytics consent is opt-in — PostHog must not load until the user accepts.
// This module persists the choice so the banner is shown only once.
describe('consent', () => {
  it('is null before any choice is made', () => {
    expect(getConsent()).toBeNull();
  });

  it('persists an accept', () => {
    setConsent(CONSENT_ACCEPTED);
    expect(getConsent()).toBe('accepted');
  });

  it('persists a decline', () => {
    setConsent(CONSENT_DECLINED);
    expect(getConsent()).toBe('declined');
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('posthog-js', () => ({
  default: { init: vi.fn(), identify: vi.fn(), reset: vi.fn() },
}));

import posthog from 'posthog-js';
import { identifyUser, resetUser } from './analytics';

// n2: PostHog must stay dormant until the user consents. identify/reset are
// called on login/logout, but must NOT touch PostHog before initAnalytics runs.
describe('analytics gating (before consent)', () => {
  beforeEach(() => { posthog.identify.mockClear(); posthog.reset.mockClear(); });

  it('identifyUser does nothing before init', () => {
    identifyUser({ _id: 'u1', email: 'a@b.co' });
    expect(posthog.identify).not.toHaveBeenCalled();
  });

  it('resetUser does nothing before init', () => {
    resetUser();
    expect(posthog.reset).not.toHaveBeenCalled();
  });
});

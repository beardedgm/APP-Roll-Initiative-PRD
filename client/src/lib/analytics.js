import posthog from 'posthog-js';
import { redactAnalyticsEvent } from './redactUrl';

let initialized = false;

// Initialize PostHog. Called ONLY after the user has consented to analytics (n2)
// — either on load if consent was previously given, or from the consent banner's
// Accept. Idempotent, and a no-op if no key is configured.
export function initAnalytics() {
  if (initialized) return;
  const key = import.meta.env.VITE_POSTHOG_KEY;
  if (!key) return;
  posthog.init(key, {
    api_host: import.meta.env.VITE_POSTHOG_HOST || 'https://us.i.posthog.com',
    autocapture: true,
    // Strip auth tokens from URL-valued properties before any event is sent.
    before_send: redactAnalyticsEvent,
  });
  initialized = true;
}

// identify/reset are no-ops until PostHog has been initialized (i.e. consented),
// so a login/logout before consent never touches analytics.
export function identifyUser(user) {
  if (!initialized || !user) return;
  posthog.identify(user._id, {
    email: user.email,
    displayName: user.displayName,
    role: user.role,
    subscriptionStatus: user.subscriptionStatus,
    emailVerified: user.emailVerified,
  });
}

export function resetUser() {
  if (!initialized) return;
  posthog.reset();
}

import posthog from 'posthog-js';

// posthog-js queues calls until init finishes, so we don't guard on
// `__loaded` — doing so silently dropped the first identify when the
// network hadn't resolved the posthog bootstrap yet.
export function identifyUser(user) {
  if (!user) return;
  posthog.identify(user._id, {
    email: user.email,
    displayName: user.displayName,
    role: user.role,
    subscriptionStatus: user.subscriptionStatus,
    emailVerified: user.emailVerified,
  });
}

export function resetUser() {
  posthog.reset();
}

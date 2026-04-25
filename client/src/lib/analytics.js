import posthog from 'posthog-js';

export function identifyUser(user) {
  if (!user || !posthog.__loaded) return;
  posthog.identify(user._id, {
    email: user.email,
    displayName: user.displayName,
    role: user.role,
    subscriptionStatus: user.subscriptionStatus,
    emailVerified: user.emailVerified,
  });
}

export function resetUser() {
  if (!posthog.__loaded) return;
  posthog.reset();
}

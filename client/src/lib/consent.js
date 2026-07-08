// Analytics consent (opt-in). PostHog must not load until the user accepts (n2).
// The choice is persisted so the banner is shown only once.
const KEY = 'analytics_consent';

export const CONSENT_ACCEPTED = 'accepted';
export const CONSENT_DECLINED = 'declined';

/** @returns {'accepted'|'declined'|null} */
export function getConsent() {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export function setConsent(value) {
  try {
    localStorage.setItem(KEY, value);
  } catch {
    /* storage unavailable (private mode) — treat as no persisted choice */
  }
}

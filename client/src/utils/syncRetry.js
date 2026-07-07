// Retry policy for the user-data sync PUT (finding f28). A failed sync was never
// retried, so a transient network blip left the store 'error' until the user
// happened to make another edit. Retry transient failures with backoff, but
// never retry a permanent 4xx (validation/auth/not-found) — that would loop
// forever with no chance of success.

const BASE_DELAY_MS = 3000;
const MAX_DELAY_MS = 30000;

/** Max automatic retries before giving up and surfacing 'error'. */
export const MAX_SYNC_RETRIES = 4;

/**
 * Whether a failed sync is worth retrying. Retryable: no response (network /
 * timeout), any 5xx, or 429 (rate limit). Not retryable: other 4xx.
 */
export function isRetryableSyncError(err) {
  const status = err?.response?.status;
  if (status == null) return true;
  if (status === 429) return true;
  return status >= 500;
}

/** Exponential backoff (3s, 6s, 12s, …) capped at 30s, for the Nth retry. */
export function syncBackoffDelay(attempt) {
  return Math.min(MAX_DELAY_MS, BASE_DELAY_MS * 2 ** attempt);
}

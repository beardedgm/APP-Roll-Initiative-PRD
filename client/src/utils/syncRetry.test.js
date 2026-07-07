import { describe, it, expect } from 'vitest';
import { isRetryableSyncError, syncBackoffDelay, MAX_SYNC_RETRIES } from './syncRetry';

// f28: a failed user-data PUT was never retried. Transient failures (network
// drop, 5xx, 429) should retry with backoff; permanent ones (400/403/404) must
// not — retrying them just loops forever with no chance of success.
describe('isRetryableSyncError', () => {
  it('retries a network error with no response', () => {
    expect(isRetryableSyncError(new Error('Network Error'))).toBe(true);
  });

  it('retries 5xx server errors', () => {
    expect(isRetryableSyncError({ response: { status: 500 } })).toBe(true);
    expect(isRetryableSyncError({ response: { status: 503 } })).toBe(true);
  });

  it('retries 429 rate-limit', () => {
    expect(isRetryableSyncError({ response: { status: 429 } })).toBe(true);
  });

  it('does NOT retry permanent 4xx errors', () => {
    expect(isRetryableSyncError({ response: { status: 400 } })).toBe(false);
    expect(isRetryableSyncError({ response: { status: 403 } })).toBe(false);
    expect(isRetryableSyncError({ response: { status: 404 } })).toBe(false);
  });
});

describe('syncBackoffDelay', () => {
  it('grows exponentially from 3s', () => {
    expect(syncBackoffDelay(0)).toBe(3000);
    expect(syncBackoffDelay(1)).toBe(6000);
    expect(syncBackoffDelay(2)).toBe(12000);
  });

  it('caps at 30s', () => {
    expect(syncBackoffDelay(10)).toBe(30000);
  });

  it('exposes a bounded retry count', () => {
    expect(MAX_SYNC_RETRIES).toBeGreaterThan(0);
    expect(MAX_SYNC_RETRIES).toBeLessThanOrEqual(6);
  });
});

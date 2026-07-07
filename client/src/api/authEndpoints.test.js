import { describe, it, expect } from 'vitest';
import { isAuthEndpoint } from './authEndpoints';

// f6: the global 401 interceptor redirected to /login on ANY 401 except
// /auth/me. But login/change-password/delete-account return 401 for a simply
// wrong password — the redirect then reloaded the page and swallowed the error
// message. The interceptor must skip ALL auth endpoints (they show their own
// errors) and redirect only for protected data routes (a real expired session).
describe('isAuthEndpoint', () => {
  it('flags every auth credential endpoint', () => {
    expect(isAuthEndpoint('/auth/login')).toBe(true);
    expect(isAuthEndpoint('/auth/me')).toBe(true);
    expect(isAuthEndpoint('/auth/change-password')).toBe(true);
    expect(isAuthEndpoint('/auth/account')).toBe(true);
    expect(isAuthEndpoint('/auth/register')).toBe(true);
  });

  it('does not flag protected data routes', () => {
    expect(isAuthEndpoint('/user-data')).toBe(false);
    expect(isAuthEndpoint('/encounters/123')).toBe(false);
    expect(isAuthEndpoint('/monsters/search')).toBe(false);
  });

  it('handles a missing url', () => {
    expect(isAuthEndpoint(undefined)).toBe(false);
    expect(isAuthEndpoint(null)).toBe(false);
  });
});

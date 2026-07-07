// Endpoints that authenticate credentials and surface their own errors. A 401
// from one of these is a wrong password (or unverified email), NOT an expired
// session — so the global 401 interceptor must not redirect to /login for them,
// or it would reload the page and swallow the form's error message (finding f6).
export function isAuthEndpoint(url) {
  return typeof url === 'string' && url.includes('/auth/');
}

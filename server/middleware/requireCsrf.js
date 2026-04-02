/**
 * CSRF protection via X-header double-submit pattern.
 * Requires a custom header (X-Requested-With) on all state-changing requests.
 * Browsers block cross-origin requests from setting custom headers,
 * so this prevents CSRF attacks when combined with strict CORS.
 */
export default function requireCsrf(req, res, next) {
  // Only enforce on state-changing methods
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }

  if (req.headers['x-requested-with'] === 'XMLHttpRequest') {
    return next();
  }

  return res.status(403).json({ error: 'Missing CSRF header' });
}

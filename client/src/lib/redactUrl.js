// Strip auth tokens from URLs before they reach analytics (finding f5).
// Password-reset and email-verify links carry the raw token in the query string;
// PostHog and Google Analytics both record the full URL, so the token must be
// removed from any URL-bearing property before send.
//
// NOTE: index.html inlines an equivalent param list for the gtag config call
// (it runs before this bundle loads and cannot import a module). Keep the two
// lists in sync.
const SENSITIVE_PARAMS = ['token', 'access_token', 'reset_token', 'verify_token'];

/**
 * Remove known sensitive query params from a URL string (absolute or relative).
 * Returns the input unchanged when it is not a string or has no such params.
 */
export function stripSensitiveParams(url) {
  if (typeof url !== 'string') return url;
  try {
    const hasOrigin = /^[a-z][a-z0-9+.-]*:\/\//i.test(url);
    const u = new URL(url, 'http://placeholder.invalid');
    let changed = false;
    for (const param of SENSITIVE_PARAMS) {
      if (u.searchParams.has(param)) {
        u.searchParams.delete(param);
        changed = true;
      }
    }
    if (!changed) return url;
    return hasOrigin ? u.href : `${u.pathname}${u.search}${u.hash}`;
  } catch {
    return url;
  }
}

/**
 * PostHog `before_send` hook: scrub tokens from any URL-valued property.
 * Returns the (mutated) event, or the input unchanged if it has no properties.
 */
export function redactAnalyticsEvent(event) {
  if (!event?.properties) return event;
  for (const key of ['$current_url', '$referrer', '$pathname']) {
    if (typeof event.properties[key] === 'string') {
      event.properties[key] = stripSensitiveParams(event.properties[key]);
    }
  }
  return event;
}

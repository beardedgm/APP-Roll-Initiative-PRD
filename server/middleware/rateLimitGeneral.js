import LoginAttempt from '../models/LoginAttempt.js';

/**
 * General IP-based rate limiter.
 * Reuses the LoginAttempt model (which has a 15-min TTL index)
 * with a synthetic email field to avoid creating new models/indexes.
 *
 * @param {string} action - Unique action name (e.g., 'register', 'forgot-password')
 * @param {number} maxPerWindow - Max requests per 15-min window per IP (default: 5)
 */
export function rateLimitByIP(action, maxPerWindow = 5) {
  return async function (req, res, next) {
    const ip = req.ip || req.connection.remoteAddress;
    const syntheticEmail = `__${action}__`;

    try {
      const count = await LoginAttempt.countDocuments({ ip, email: syntheticEmail });

      if (count >= maxPerWindow) {
        return res.status(429).json({ error: 'Too many requests. Try again in 15 minutes.' });
      }

      await LoginAttempt.create({ ip, email: syntheticEmail });
      next();
    } catch {
      // Don't block the request if rate limiting fails
      next();
    }
  };
}

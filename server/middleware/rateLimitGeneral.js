import LoginAttempt from '../models/LoginAttempt.js';
import logger from '../config/logger.js';

const WINDOW_MS = 15 * 60 * 1000; // 15 minutes

// In-memory fallback rate limiter
const memoryStore = new Map();

function cleanMemoryStore() {
  const now = Date.now();
  for (const [key, entry] of memoryStore) {
    if (now - entry.firstAttempt > WINDOW_MS) {
      memoryStore.delete(key);
    }
  }
}

function checkMemoryLimit(key, max) {
  cleanMemoryStore();
  const now = Date.now();
  const entry = memoryStore.get(key);
  if (!entry || now - entry.firstAttempt > WINDOW_MS) {
    memoryStore.set(key, { count: 1, firstAttempt: now });
    return false;
  }
  entry.count += 1;
  return entry.count > max;
}

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
      const windowStart = new Date(Date.now() - WINDOW_MS);
      const count = await LoginAttempt.countDocuments({
        ip,
        email: syntheticEmail,
        at: { $gte: windowStart },
      });

      if (count >= maxPerWindow) {
        return res.status(429).json({ error: 'Too many requests. Try again in 15 minutes.' });
      }

      // kind:'action' keeps these rows out of the auth limiter's counts
      await LoginAttempt.create({ ip, email: syntheticEmail, kind: 'action' });
      next();
    } catch (err) {
      logger.error({ err }, 'DB rate limiter failed, using in-memory fallback');
      // Fail OPEN by design: a DB outage must not reject every rate-limited
      // action. The in-memory counter still caps abuse per process.
      const limited = checkMemoryLimit(`${action}:${ip}`, maxPerWindow);
      if (limited) {
        return res.status(429).json({ error: 'Too many requests. Try again in 15 minutes.' });
      }
      next();
    }
  };
}

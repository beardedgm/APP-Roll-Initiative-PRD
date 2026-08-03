import LoginAttempt from '../models/LoginAttempt.js';
import logger from '../config/logger.js';

const MAX_ATTEMPTS_PER_IP = 15;     // per 15-min window
const MAX_ATTEMPTS_PER_EMAIL = 5;   // per 15-min window
const WINDOW_MS = 15 * 60 * 1000;   // 15 minutes

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

export default async function rateLimitAuth(req, res, next) {
  const ip = req.ip || req.connection.remoteAddress;
  const email = (req.body.email || '').toLowerCase().trim();

  if (!email) return next();

  try {
    // Count only real auth attempts (kind:'auth') inside the exact window.
    // rateLimitByIP writes kind:'action' rows into the same collection — they
    // must never count against login. The `at` predicate keeps the window
    // honest even when Mongo's TTL sweeper (runs ~every 60s) lags.
    const windowStart = new Date(Date.now() - WINDOW_MS);
    const [ipCount, emailCount] = await Promise.all([
      LoginAttempt.countDocuments({ ip, kind: 'auth', at: { $gte: windowStart } }),
      LoginAttempt.countDocuments({ email, kind: 'auth', at: { $gte: windowStart } }),
    ]);

    if (ipCount >= MAX_ATTEMPTS_PER_IP || emailCount >= MAX_ATTEMPTS_PER_EMAIL) {
      return res.status(429).json({ error: 'Too many login attempts. Try again in 15 minutes.' });
    }

    // Record attempt (will be cleaned up by TTL index)
    await LoginAttempt.create({ ip, email });
    next();
  } catch (err) {
    logger.error({ err }, 'DB rate limiter failed, using in-memory fallback');
    // Fail OPEN by design: rejecting everyone during a DB outage would lock all
    // users out of login. The in-memory counter still caps abuse per process.
    const ipLimited = checkMemoryLimit(`ip:${ip}`, MAX_ATTEMPTS_PER_IP);
    const emailLimited = checkMemoryLimit(`email:${email}`, MAX_ATTEMPTS_PER_EMAIL);
    if (ipLimited || emailLimited) {
      return res.status(429).json({ error: 'Too many login attempts. Try again in 15 minutes.' });
    }
    next();
  }
}

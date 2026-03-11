import { Router } from 'express';
import mongoose from 'mongoose';

const router = Router();

// In-memory rate limiter for health endpoint (30 req / 15 min per IP)
const healthRateLimitMap = new Map();
const HEALTH_WINDOW_MS = 15 * 60 * 1000;
const HEALTH_MAX_REQUESTS = 30;

function healthRateLimit(req, res, next) {
  const ip = req.ip || req.connection.remoteAddress;
  const now = Date.now();
  const entry = healthRateLimitMap.get(ip);

  // Clean stale entries periodically (every 100 requests)
  if (healthRateLimitMap.size > 1000) {
    for (const [key, val] of healthRateLimitMap) {
      if (now - val.start > HEALTH_WINDOW_MS) {
        healthRateLimitMap.delete(key);
      }
    }
  }

  if (!entry || now - entry.start > HEALTH_WINDOW_MS) {
    healthRateLimitMap.set(ip, { count: 1, start: now });
    return next();
  }

  entry.count += 1;
  if (entry.count > HEALTH_MAX_REQUESTS) {
    return res.status(429).json({ error: 'Too many requests. Try again later.' });
  }

  next();
}

router.get('/api/health', healthRateLimit, async (req, res) => {
  try {
    await mongoose.connection.db.admin().ping();
    res.json({ status: 'ok', db: 'connected' });
  } catch (_err) {
    res.status(503).json({ status: 'error', db: 'disconnected' });
  }
});

export default router;

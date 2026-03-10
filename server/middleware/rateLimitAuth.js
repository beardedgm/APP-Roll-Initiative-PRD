import LoginAttempt from '../models/LoginAttempt.js';

const MAX_ATTEMPTS_PER_IP = 15;     // per 15-min window
const MAX_ATTEMPTS_PER_EMAIL = 5;   // per 15-min window

export default async function rateLimitAuth(req, res, next) {
  const ip = req.ip || req.connection.remoteAddress;
  const email = (req.body.email || '').toLowerCase().trim();

  if (!email) return next();

  try {
    const [ipCount, emailCount] = await Promise.all([
      LoginAttempt.countDocuments({ ip }),
      LoginAttempt.countDocuments({ email }),
    ]);

    if (ipCount >= MAX_ATTEMPTS_PER_IP || emailCount >= MAX_ATTEMPTS_PER_EMAIL) {
      return res.status(429).json({ error: 'Too many login attempts. Try again in 15 minutes.' });
    }

    // Record attempt (will be cleaned up by TTL index)
    await LoginAttempt.create({ ip, email });
    next();
  } catch {
    // Don't block auth if rate limiting fails
    next();
  }
}

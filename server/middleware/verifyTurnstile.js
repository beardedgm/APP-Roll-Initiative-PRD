import logger from '../config/logger.js';

const TURNSTILE_VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

/**
 * Middleware to verify Cloudflare Turnstile token.
 * Expects req.body.turnstileToken. Skips verification if
 * TURNSTILE_SECRET_KEY is not set (development mode).
 */
export default async function verifyTurnstile(req, res, next) {
  const secret = process.env.TURNSTILE_SECRET_KEY;

  if (!secret) {
    // Development: skip verification
    return next();
  }

  const token = req.body?.turnstileToken;
  if (!token) {
    return res.status(400).json({ error: 'CAPTCHA verification required' });
  }

  try {
    const response = await fetch(TURNSTILE_VERIFY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        secret,
        response: token,
        remoteip: req.ip,
      }),
    });

    const result = await response.json();

    if (!result.success) {
      logger.warn({ codes: result['error-codes'] }, 'Turnstile verification failed');
      return res.status(400).json({ error: 'CAPTCHA verification failed. Please try again.' });
    }

    next();
  } catch (err) {
    logger.error({ err }, 'Turnstile API call failed');
    res.status(503).json({ error: 'Verification service temporarily unavailable. Please try again.' });
  }
}

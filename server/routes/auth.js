import { Router } from 'express';
import User from '../models/User.js';
import EmailToken from '../models/EmailToken.js';
import LoginAttempt from '../models/LoginAttempt.js';
import validate from '../middleware/validate.js';
import requireAuth from '../middleware/requireAuth.js';
import rateLimitAuth from '../middleware/rateLimitAuth.js';
import { rateLimitByIP } from '../middleware/rateLimitGeneral.js';
import { destroyOtherSessions, destroyAllSessions } from '../utils/sessionUtils.js';
import verifyTurnstile from '../middleware/verifyTurnstile.js';
import { registerSchema, loginSchema, forgotPasswordSchema, resetPasswordSchema, changePasswordSchema, updateProfileSchema, deleteAccountSchema } from '../validators/auth.js';
import { sendVerificationEmail, sendPasswordResetEmail, sendWelcomeEmail } from '../services/emailService.js';
import Encounter from '../models/Encounter.js';
import stripe from '../config/stripe.js';
import logger from '../config/logger.js';

const router = Router();

/**
 * Regenerate session and set userId, then call the callback.
 * Prevents session fixation by creating a new session ID after authentication.
 */
function regenerateSession(req, userId, callback) {
  req.session.regenerate((err) => {
    if (err) {
      logger.error({ err }, 'Session regeneration failed');
      return callback(err);
    }
    req.session.userId = userId;
    req.session.save((err) => {
      if (err) {
        logger.error({ err }, 'Session save failed');
        return callback(err);
      }
      callback(null);
    });
  });
}

/**
 * POST /api/auth/register
 */
router.post('/api/auth/register', rateLimitByIP('register', 5), verifyTurnstile, validate(registerSchema), async (req, res) => {
  try {
    const { email, password, displayName } = req.validated;

    // Always return the same response shape to prevent email enumeration
    const existing = await User.findOne({ email });
    if (existing) {
      logger.info({ email }, 'Registration attempted with existing email');
      return res.json({ registered: true, message: 'Check your email to verify your account.' });
    }

    const { hashedPassword, salt } = await User.hashPassword(password);
    const user = await User.create({ email, hashedPassword, salt, displayName });

    // Send verification email
    const emailToken = await EmailToken.generate(user._id, 'verify-email', 60);
    await sendVerificationEmail(email, displayName, emailToken.token);

    // Welcome email (fire-and-forget)
    sendWelcomeEmail(email, displayName).catch(() => {});

    logger.info({ userId: user._id, email }, 'User registered');
    res.json({ registered: true, message: 'Check your email to verify your account.' });
  } catch (err) {
    logger.error({ err }, 'Registration failed');
    res.status(500).json({ error: 'Registration failed' });
  }
});

/**
 * POST /api/auth/login
 */
router.post('/api/auth/login', rateLimitAuth, verifyTurnstile, validate(loginSchema), async (req, res) => {
  try {
    const { email, password } = req.validated;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const valid = await user.verifyPassword(password);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    if (!user.emailVerified) {
      return res.status(403).json({
        error: 'Please verify your email address before logging in. Check your inbox for the verification link.',
        needsVerification: true
      });
    }

    // Clear login attempts on success
    const ip = req.ip || req.connection.remoteAddress;
    await LoginAttempt.deleteMany({ ip, email });

    // Regenerate session to prevent fixation
    regenerateSession(req, user._id, (err) => {
      if (err) {
        return res.status(500).json({ error: 'Login failed' });
      }
      logger.info({ userId: user._id, email }, 'User logged in');
      res.json({ user: user.toSafeJSON() });
    });
  } catch (err) {
    logger.error({ err }, 'Login failed');
    res.status(500).json({ error: 'Login failed' });
  }
});

/**
 * POST /api/auth/logout
 */
router.post('/api/auth/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      logger.error({ err }, 'Logout failed');
      return res.status(500).json({ error: 'Logout failed' });
    }
    res.clearCookie('connect.sid');
    res.json({ success: true });
  });
});

/**
 * GET /api/auth/me — current user
 */
router.get('/api/auth/me', async (req, res) => {
  if (!req.session?.userId) {
    return res.json({ user: null });
  }

  try {
    const user = await User.findById(req.session.userId);
    if (!user) {
      return res.json({ user: null });
    }
    res.json({ user: user.toSafeJSON() });
  } catch (err) {
    logger.error({ err }, 'Failed to fetch current user');
    res.json({ user: null });
  }
});

/**
 * POST /api/auth/verify-email
 */
router.post('/api/auth/verify-email', rateLimitByIP('verify-email', 5), async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) {
      return res.status(400).json({ error: 'Token is required' });
    }

    const emailToken = await EmailToken.findOne({ token, type: 'verify-email' });
    if (!emailToken || emailToken.expiresAt < new Date()) {
      return res.status(400).json({ error: 'Invalid or expired token' });
    }

    await User.findByIdAndUpdate(emailToken.userId, { emailVerified: true });
    await EmailToken.deleteOne({ _id: emailToken._id });

    logger.info({ userId: emailToken.userId }, 'Email verified');
    res.json({ success: true });
  } catch (err) {
    logger.error({ err }, 'Email verification failed');
    res.status(500).json({ error: 'Verification failed' });
  }
});

/**
 * POST /api/auth/forgot-password
 */
router.post('/api/auth/forgot-password', rateLimitByIP('forgot-password', 5), verifyTurnstile, validate(forgotPasswordSchema), async (req, res) => {
  try {
    const { email } = req.validated;

    // Always return success to prevent email enumeration
    const user = await User.findOne({ email });
    if (user) {
      const emailToken = await EmailToken.generate(user._id, 'reset-password', 60);
      await sendPasswordResetEmail(email, user.displayName, emailToken.token);
      logger.info({ userId: user._id, email }, 'Password reset email sent');
    }

    res.json({ success: true, message: 'If an account exists with that email, a reset link has been sent.' });
  } catch (err) {
    logger.error({ err }, 'Forgot password failed');
    res.status(500).json({ error: 'Request failed' });
  }
});

/**
 * POST /api/auth/reset-password
 */
router.post('/api/auth/reset-password', rateLimitByIP('reset-password', 5), validate(resetPasswordSchema), async (req, res) => {
  try {
    const { token, password } = req.validated;

    const emailToken = await EmailToken.findOne({ token, type: 'reset-password' });
    if (!emailToken || emailToken.expiresAt < new Date()) {
      return res.status(400).json({ error: 'Invalid or expired token' });
    }

    const { hashedPassword, salt } = await User.hashPassword(password);
    await User.findByIdAndUpdate(emailToken.userId, { hashedPassword, salt });
    await EmailToken.deleteOne({ _id: emailToken._id });

    // Invalidate all sessions — force re-login everywhere
    await destroyAllSessions(emailToken.userId);

    logger.info({ userId: emailToken.userId }, 'Password reset');
    res.json({ success: true });
  } catch (err) {
    logger.error({ err }, 'Password reset failed');
    res.status(500).json({ error: 'Reset failed' });
  }
});

/**
 * POST /api/auth/change-password (authenticated)
 */
router.post('/api/auth/change-password', requireAuth, rateLimitByIP('change-password', 5), validate(changePasswordSchema), async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.validated;
    const user = await User.findById(req.session.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const valid = await user.verifyPassword(currentPassword);
    if (!valid) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    const { hashedPassword, salt } = await User.hashPassword(newPassword);
    user.hashedPassword = hashedPassword;
    user.salt = salt;
    await user.save();

    // Invalidate all other sessions — keep the current one
    await destroyOtherSessions(user._id, req.sessionID);

    logger.info({ userId: user._id }, 'Password changed');
    res.json({ success: true });
  } catch (err) {
    logger.error({ err }, 'Change password failed');
    res.status(500).json({ error: 'Change password failed' });
  }
});

/**
 * PATCH /api/auth/profile (authenticated)
 */
router.patch('/api/auth/profile', requireAuth, validate(updateProfileSchema), async (req, res) => {
  try {
    const { displayName } = req.validated;
    const user = await User.findByIdAndUpdate(
      req.session.userId,
      { displayName },
      { new: true },
    );
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    logger.info({ userId: user._id }, 'Profile updated');
    res.json({ user: user.toSafeJSON() });
  } catch (err) {
    logger.error({ err }, 'Profile update failed');
    res.status(500).json({ error: 'Profile update failed' });
  }
});

/**
 * DELETE /api/auth/account (authenticated)
 */
router.delete('/api/auth/account', requireAuth, validate(deleteAccountSchema), async (req, res) => {
  try {
    const { password } = req.validated;
    const user = await User.findById(req.session.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const valid = await user.verifyPassword(password);
    if (!valid) {
      return res.status(401).json({ error: 'Password is incorrect' });
    }

    // Cancel Stripe subscription if active
    if (stripe && user.subscriptionId) {
      try {
        await stripe.subscriptions.cancel(user.subscriptionId);
      } catch (stripeErr) {
        logger.warn({ err: stripeErr, userId: user._id }, 'Failed to cancel Stripe subscription during account deletion');
      }
    }

    // Clean up user data
    await Promise.all([
      Encounter.deleteMany({ userId: user._id }),
      EmailToken.deleteMany({ userId: user._id }),
      destroyAllSessions(user._id),
    ]);

    await User.deleteOne({ _id: user._id });

    // Destroy current session
    req.session.destroy(() => {
      res.clearCookie('connect.sid');
      logger.info({ userId: user._id }, 'Account deleted');
      res.json({ success: true });
    });
  } catch (err) {
    logger.error({ err }, 'Account deletion failed');
    res.status(500).json({ error: 'Account deletion failed' });
  }
});

export default router;

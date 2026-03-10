import { Router } from 'express';
import User from '../models/User.js';
import EmailToken from '../models/EmailToken.js';
import LoginAttempt from '../models/LoginAttempt.js';
import validate from '../middleware/validate.js';
import requireAuth from '../middleware/requireAuth.js';
import rateLimitAuth from '../middleware/rateLimitAuth.js';
import { registerSchema, loginSchema, forgotPasswordSchema, resetPasswordSchema, changePasswordSchema } from '../validators/auth.js';
import { sendVerificationEmail, sendPasswordResetEmail } from '../services/emailService.js';
import logger from '../config/logger.js';

const router = Router();

/**
 * POST /api/auth/register
 */
router.post('/api/auth/register', validate(registerSchema), async (req, res) => {
  try {
    const { email, password, displayName } = req.validated;

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(409).json({ error: 'An account with this email already exists' });
    }

    const { hashedPassword, salt } = await User.hashPassword(password);
    const user = await User.create({ email, hashedPassword, salt, displayName });

    // Send verification email
    const emailToken = await EmailToken.generate(user._id, 'verify-email', 60);
    await sendVerificationEmail(email, displayName, emailToken.token);

    // Log them in immediately
    req.session.userId = user._id;

    logger.info({ userId: user._id, email }, 'User registered');
    res.status(201).json({ user: user.toSafeJSON() });
  } catch (err) {
    logger.error({ err }, 'Registration failed');
    res.status(500).json({ error: 'Registration failed' });
  }
});

/**
 * POST /api/auth/login
 */
router.post('/api/auth/login', rateLimitAuth, validate(loginSchema), async (req, res) => {
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

    // Clear login attempts on success
    const ip = req.ip || req.connection.remoteAddress;
    await LoginAttempt.deleteMany({ ip, email });

    req.session.userId = user._id;

    logger.info({ userId: user._id, email }, 'User logged in');
    res.json({ user: user.toSafeJSON() });
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
router.post('/api/auth/verify-email', async (req, res) => {
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
router.post('/api/auth/forgot-password', validate(forgotPasswordSchema), async (req, res) => {
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
router.post('/api/auth/reset-password', validate(resetPasswordSchema), async (req, res) => {
  try {
    const { token, password } = req.validated;

    const emailToken = await EmailToken.findOne({ token, type: 'reset-password' });
    if (!emailToken || emailToken.expiresAt < new Date()) {
      return res.status(400).json({ error: 'Invalid or expired token' });
    }

    const { hashedPassword, salt } = await User.hashPassword(password);
    await User.findByIdAndUpdate(emailToken.userId, { hashedPassword, salt });
    await EmailToken.deleteOne({ _id: emailToken._id });

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
router.post('/api/auth/change-password', requireAuth, validate(changePasswordSchema), async (req, res) => {
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

    logger.info({ userId: user._id }, 'Password changed');
    res.json({ success: true });
  } catch (err) {
    logger.error({ err }, 'Change password failed');
    res.status(500).json({ error: 'Change password failed' });
  }
});

export default router;

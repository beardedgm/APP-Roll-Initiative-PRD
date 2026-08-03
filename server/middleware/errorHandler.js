import * as Sentry from '@sentry/node';
import logger from '../config/logger.js';

/**
 * Centralized error-handling middleware.
 * Must be registered AFTER all routes in app.js (4 params = Express error handler).
 */
export default function errorHandler(err, req, res, _next) {
  // Mongoose validation errors. details is masked in production like the 500
  // path below — Mongoose messages embed schema paths and rejected values.
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      error: 'Validation failed',
      ...(process.env.NODE_ENV === 'production' ? {} : { details: err.message }),
    });
  }

  // Mongoose cast errors (invalid ObjectId, etc.)
  if (err.name === 'CastError') {
    return res.status(400).json({ error: 'Invalid ID format' });
  }

  // Zod errors (shouldn't reach here since validate middleware handles them)
  if (err.name === 'ZodError') {
    return res.status(400).json({ error: 'Validation failed' });
  }

  // Report to Sentry + log
  Sentry.captureException(err);
  logger.error({ err, method: req.method, url: req.originalUrl }, 'Unhandled error');

  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === 'production'
      ? 'Internal server error'
      : err.message,
  });
}

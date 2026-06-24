import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from project root
dotenv.config({ path: path.join(__dirname, '..', '.env') });

import * as Sentry from '@sentry/node';
import { initSentry } from './config/sentry.js';

initSentry();

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';

import { connectDB } from './config/db.js';
import configureSession from './config/session.js';
import logger from './config/logger.js';
import requestLogger from './middleware/requestLogger.js';
import healthRouter from './routes/health.js';
import monstersRouter from './routes/monsters.js';
import spellsRouter from './routes/spells.js';
import authRouter from './routes/auth.js';
import encountersRouter, { sharedEncounterRouter } from './routes/encounters.js';
import userDataRouter from './routes/userData.js';
import billingRouter, { webhookRouter } from './routes/billing.js';
import { emailWebhookRouter } from './routes/emailWebhooks.js';
import sitemapRouter from './routes/sitemap.js';
import requireCsrf from './middleware/requireCsrf.js';
import errorHandler from './middleware/errorHandler.js';

// ── Process-level error handlers ─────────────────────────────
process.on('unhandledRejection', (reason) => {
  logger.error({ err: reason }, 'Unhandled promise rejection');
  Sentry.captureException(reason);
});

process.on('uncaughtException', (err) => {
  logger.error({ err }, 'Uncaught exception — shutting down');
  Sentry.captureException(err);
  Sentry.flush(2000).finally(() => process.exit(1));
});

const app = express();
app.set('trust proxy', 1);
const PORT = process.env.PORT || 5000;

// ── Connect to MongoDB ─────────────────────────────────────
const dbConnected = await connectDB();

// ── Middleware ──────────────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: process.env.NODE_ENV === 'production'
    ? {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: [
            "'self'",
            'https://challenges.cloudflare.com',  // Turnstile
            'https://us-assets.i.posthog.com',    // PostHog scripts
            "'unsafe-inline'",                     // PostHog inline scripts
          ],
          connectSrc: [
            "'self'",
            'https://*.posthog.com',               // PostHog analytics
            'https://*.ingest.sentry.io',          // Sentry error reporting
            'https://challenges.cloudflare.com',   // Turnstile verification
          ],
          frameSrc: [
            "'self'",
            'https://challenges.cloudflare.com',   // Turnstile iframe
          ],
          imgSrc: ["'self'", 'data:', 'blob:'],
          styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
          fontSrc: ["'self'", 'https://fonts.gstatic.com'],
          objectSrc: ["'none'"],
          upgradeInsecureRequests: [],
        },
      }
    : false,
}));

const corsSource = process.env.CORS_ORIGINS || process.env.APP_URL || '';
const allowedOrigins = process.env.NODE_ENV === 'production'
  ? corsSource.split(',').map(s => s.trim()).filter(Boolean)
  : ['http://localhost:5173'];

if (process.env.NODE_ENV === 'production' && allowedOrigins.length === 0) {
  throw new Error('CORS_ORIGINS or APP_URL must be set in production');
}

app.use(cors({
  origin(origin, callback) {
    // Allow requests with no origin (server-to-server, curl, health checks)
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));

// Request logging
app.use(requestLogger);

// Stripe + Resend webhooks need raw body — mount BEFORE express.json()
app.use(webhookRouter);
app.use(emailWebhookRouter);

// Custom monster libraries (rawMarkdown stat blocks) make user-data syncs
// large; the 100KB Express default was silently 413-ing them — a likely
// direct cause of lost custom-monster data. 2MB is generous headroom.
app.use(express.json({ limit: '2mb' }));

// Only set up session store if DB is connected
if (dbConnected) {
  app.use(configureSession());
} else {
  logger.warn('Sessions disabled — no database connection');
}

// Investigation breadcrumb: log any user-data sync body that would have failed
// the old 100KB default, to confirm whether the limit caused the data loss.
// Placed after session setup so req.session is available.
app.use('/api/user-data', (req, res, next) => {
  const len = Number(req.headers['content-length'] || 0);
  if (len > 100 * 1024) {
    logger.warn({ userId: req.session?.userId, bytes: len }, 'large user-data sync body (would have failed old 100KB limit)');
  }
  next();
});

// ── CSRF Protection ────────────────────────────────────────
// Applied to all /api/* routes except the Stripe webhook (which uses its own signature verification)
app.use('/api', (req, res, next) => {
  // Skip CSRF for webhook routes — they verify with HMAC signatures instead
  if (req.path === '/billing/webhook' || req.path === '/email/webhook') return next();
  requireCsrf(req, res, next);
});

// ── SEO Routes ──────────────────────────────────────────────
app.use(sitemapRouter);

// ── API Routes ─────────────────────────────────────────────
app.use(healthRouter);
app.use(authRouter);
app.use(monstersRouter);
app.use(spellsRouter);
app.use(encountersRouter);
app.use(userDataRouter);
app.use(billingRouter);
app.use(sharedEncounterRouter); // public: no auth required

// ── Serve React build in production ────────────────────────
if (process.env.NODE_ENV === 'production') {
  // Hashed assets (JS/CSS) — cache forever (filenames change each build)
  app.use('/assets', express.static(path.join(__dirname, '../client/dist/assets'), {
    maxAge: '1y',
    immutable: true,
  }));

  // Everything else in dist (index.html, favicon, etc.) — never cache
  app.use(express.static(path.join(__dirname, '../client/dist'), {
    maxAge: 0,
    setHeaders(res, filePath) {
      if (filePath.endsWith('.html')) {
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      }
    },
  }));

  app.get('{*path}', (req, res) => {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.sendFile(path.join(__dirname, '../client/dist/index.html'));
  });
}

// ── Error Handler (must be last middleware) ─────────────────
app.use(errorHandler);

// ── Start Server ───────────────────────────────────────────
const server = app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
});

// ── Graceful Shutdown ──────────────────────────────────────
function gracefulShutdown(signal) {
  logger.info(`${signal} received. Starting graceful shutdown...`);

  server.close(async () => {
    logger.info('HTTP server closed');
    try {
      await mongoose.connection.close();
      logger.info('MongoDB connection closed');
      process.exit(0);
    } catch (err) {
      logger.error({ err }, 'Error during shutdown');
      process.exit(1);
    }
  });

  setTimeout(() => {
    logger.error('Forced shutdown — graceful shutdown timed out');
    process.exit(1);
  }, 10000);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

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
import authRouter from './routes/auth.js';
import encountersRouter, { sharedEncounterRouter } from './routes/encounters.js';
import billingRouter, { webhookRouter } from './routes/billing.js';
import sitemapRouter from './routes/sitemap.js';
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
  contentSecurityPolicy: process.env.NODE_ENV === 'production' ? undefined : false,
}));

app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? process.env.APP_URL
    : 'http://localhost:5173',
  credentials: true,
}));

// Request logging
app.use(requestLogger);

// Stripe webhook needs raw body — mount BEFORE express.json()
app.use(webhookRouter);

app.use(express.json());

// Only set up session store if DB is connected
if (dbConnected) {
  app.use(configureSession());
} else {
  logger.warn('Sessions disabled — no database connection');
}

// ── SEO Routes ──────────────────────────────────────────────
app.use(sitemapRouter);

// ── API Routes ─────────────────────────────────────────────
app.use(healthRouter);
app.use(authRouter);
app.use(monstersRouter);
app.use(encountersRouter);
app.use(billingRouter);
app.use(sharedEncounterRouter); // public: no auth required

// ── Serve React build in production ────────────────────────
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../client/dist')));

  app.get('{*path}', (req, res) => {
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

import { Router } from 'express';
import mongoose from 'mongoose';
import { rateLimitByIP } from '../middleware/rateLimitGeneral.js';
import asyncHandler from '../utils/asyncHandler.js';

const router = Router();

// RENDER_GIT_COMMIT is injected by Render at deploy time; falls back to
// 'local' off-platform. Lets us confirm which commit is actually live
// (e.g. `curl .../api/health` after a deploy).
const COMMIT = process.env.RENDER_GIT_COMMIT || 'local';

router.get('/api/health', rateLimitByIP('health', 30), asyncHandler(async (req, res) => {
  await mongoose.connection.db.admin().ping();
  res.json({ status: 'ok', db: 'connected', commit: COMMIT });
}));

export default router;

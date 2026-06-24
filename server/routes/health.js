import { Router } from 'express';
import mongoose from 'mongoose';
import Monster from '../models/Monster.js';
import Spell from '../models/Spell.js';
import { rateLimitByIP } from '../middleware/rateLimitGeneral.js';
import asyncHandler from '../utils/asyncHandler.js';

const router = Router();

// RENDER_GIT_COMMIT is injected by Render at deploy time; falls back to
// 'local' off-platform. Lets us confirm which commit is actually live.
const COMMIT = process.env.RENDER_GIT_COMMIT || 'local';

router.get('/api/health', rateLimitByIP('health', 30), asyncHandler(async (req, res) => {
  await mongoose.connection.db.admin().ping();
  const [monsters, spells] = await Promise.all([
    Monster.estimatedDocumentCount(),
    Spell.estimatedDocumentCount(),
  ]);
  res.json({ status: 'ok', db: 'connected', commit: COMMIT, monsters, spells });
}));

export default router;

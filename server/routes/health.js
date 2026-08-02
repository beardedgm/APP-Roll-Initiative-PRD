import { Router } from 'express';
import mongoose from 'mongoose';
import Monster from '../models/Monster.js';
import Spell from '../models/Spell.js';
import { rateLimitMemory } from '../middleware/rateLimitMemory.js';
import asyncHandler from '../utils/asyncHandler.js';

const router = Router();

// RENDER_GIT_COMMIT is injected by Render at deploy time; falls back to
// 'local' off-platform. Lets us confirm which commit is actually live.
const COMMIT = process.env.RENDER_GIT_COMMIT || 'local';

// In-memory limiter: platform health probes can fire every few seconds
// (well past the old 30/window DB-backed cap, which 429'd the prober and
// wrote a LoginAttempt row per probe). 600/15min still flood-caps this
// public endpoint's DB ping without ever throttling a legitimate prober.
router.get('/api/health', rateLimitMemory('health', 600), asyncHandler(async (req, res) => {
  await mongoose.connection.db.admin().ping();
  const [monsters, spells] = await Promise.all([
    Monster.estimatedDocumentCount(),
    Spell.estimatedDocumentCount(),
  ]);
  res.json({ status: 'ok', db: 'connected', commit: COMMIT, monsters, spells });
}));

export default router;

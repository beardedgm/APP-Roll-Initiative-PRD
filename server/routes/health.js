import { Router } from 'express';
import mongoose from 'mongoose';
import { rateLimitByIP } from '../middleware/rateLimitGeneral.js';
import asyncHandler from '../utils/asyncHandler.js';

const router = Router();

router.get('/api/health', rateLimitByIP('health', 30), asyncHandler(async (req, res) => {
  await mongoose.connection.db.admin().ping();
  res.json({ status: 'ok', db: 'connected' });
}));

export default router;

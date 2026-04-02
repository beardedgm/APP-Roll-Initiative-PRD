import { Router } from 'express';
import UserData from '../models/UserData.js';
import requireAuth from '../middleware/requireAuth.js';
import requireSubscription from '../middleware/requireSubscription.js';
import validate from '../middleware/validate.js';
import { updateUserDataSchema } from '../validators/userData.js';
import asyncHandler from '../utils/asyncHandler.js';

const router = Router();

router.use('/api/user-data', requireAuth, requireSubscription);

// ── Get user data (or create empty doc) ────────────────────
router.get('/api/user-data', asyncHandler(async (req, res) => {
  let doc = await UserData.findOne({ userId: req.session.userId }).lean();
  if (!doc) {
    doc = await UserData.create({ userId: req.session.userId });
    doc = doc.toObject();
  }
  res.json({
    version: doc.version,
    characters: doc.characters,
    customMonsters: doc.customMonsters,
    encounterPresets: doc.encounterPresets,
  });
}));

// ── Update user data (optimistic concurrency) ──────────────
router.put('/api/user-data', validate(updateUserDataSchema), asyncHandler(async (req, res) => {
  const { version, characters, customMonsters, encounterPresets } = req.validated;

  const doc = await UserData.findOneAndUpdate(
    { userId: req.session.userId, version },
    {
      $set: { characters, customMonsters, encounterPresets },
      $inc: { version: 1 },
    },
    { new: true }
  );

  if (!doc) {
    // Version mismatch — return server's current data
    const current = await UserData.findOne({ userId: req.session.userId }).lean();
    if (!current) {
      return res.status(404).json({ error: 'User data not found' });
    }
    return res.status(409).json({
      error: 'Version conflict',
      version: current.version,
      characters: current.characters,
      customMonsters: current.customMonsters,
      encounterPresets: current.encounterPresets,
    });
  }

  res.json({
    version: doc.version,
    characters: doc.characters,
    customMonsters: doc.customMonsters,
    encounterPresets: doc.encounterPresets,
  });
}));

export default router;

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

// ── Update user data (merge strategy: newest change wins) ──
router.put('/api/user-data', validate(updateUserDataSchema), asyncHandler(async (req, res) => {
  const { characters, customMonsters, encounterPresets } = req.validated;

  // Get or create current server doc
  let current = await UserData.findOne({ userId: req.session.userId });
  if (!current) {
    current = await UserData.create({ userId: req.session.userId });
  }

  // Merge each array: combine both sides, deduplicate by name, newest updatedAt wins
  const merged = {
    characters: mergeByName(current.characters, characters),
    customMonsters: mergeByName(current.customMonsters, customMonsters),
    encounterPresets: mergeByName(current.encounterPresets, encounterPresets),
  };

  const doc = await UserData.findOneAndUpdate(
    { userId: req.session.userId },
    {
      $set: merged,
      $inc: { version: 1 },
    },
    { new: true }
  );

  res.json({
    version: doc.version,
    characters: doc.characters,
    customMonsters: doc.customMonsters,
    encounterPresets: doc.encounterPresets,
  });
}));

/**
 * Merge two arrays of items by name. Items with the same name are
 * deduplicated — the one with the most recent updatedAt wins.
 * Items only on one side are always included.
 *
 * Name matching is case-insensitive and trimmed: "Gandalf" and "GANDALF"
 * are treated as the same item. This prevents accidental duplicates from
 * cross-device sync while preserving the casing of the newest version.
 */
function mergeByName(serverItems = [], clientItems = []) {
  const map = new Map();

  // Add server items first
  for (const item of serverItems) {
    const key = (item.name || '').toLowerCase().trim();
    map.set(key, item);
  }

  // Client items overwrite if newer (or if not on server)
  for (const item of clientItems) {
    const key = (item.name || '').toLowerCase().trim();
    const existing = map.get(key);

    if (!existing) {
      map.set(key, item);
    } else {
      // Newest updatedAt wins; if no timestamps, client wins
      const existingTime = existing.updatedAt ? new Date(existing.updatedAt).getTime() : 0;
      const incomingTime = item.updatedAt ? new Date(item.updatedAt).getTime() : 0;
      if (incomingTime >= existingTime) {
        map.set(key, item);
      }
    }
  }

  return [...map.values()];
}

export default router;

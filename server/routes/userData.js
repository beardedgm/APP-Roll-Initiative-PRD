import { Router } from 'express';
import UserData from '../models/UserData.js';
import requireAuth from '../middleware/requireAuth.js';
import requireSubscription from '../middleware/requireSubscription.js';
import { parseUserDataResilient } from '../validators/userData.js';
import logger from '../config/logger.js';
import asyncHandler from '../utils/asyncHandler.js';

const router = Router();

// ── Get user data (or create empty doc) ────────────────────
router.get('/api/user-data', requireAuth, asyncHandler(async (req, res) => {
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
router.put('/api/user-data', requireAuth, requireSubscription, asyncHandler(async (req, res) => {
  const parsed = parseUserDataResilient(req.body);
  if (!parsed.ok) {
    const details = parsed.error.issues.map(i => ({ path: i.path.join('.'), message: i.message }));
    return res.status(400).json({ error: 'Validation failed', details });
  }

  const { characters, customMonsters, encounterPresets } = parsed.data;

  // Skip+log invalid items instead of rejecting the whole sync — one bad
  // record must never blackhole a user's other custom data.
  if (parsed.dropped.length) {
    logger.warn(
      { userId: req.session.userId, dropped: parsed.dropped },
      'user-data sync dropped invalid items'
    );
  }

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

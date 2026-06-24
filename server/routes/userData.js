import { Router } from 'express';
import UserData from '../models/UserData.js';
import requireAuth from '../middleware/requireAuth.js';
import requireSubscription from '../middleware/requireSubscription.js';
import { parseUserDataResilient, mergeCollection, liveItems, prunedTombstones } from '../validators/userData.js';
import logger from '../config/logger.js';
import asyncHandler from '../utils/asyncHandler.js';

const router = Router();

// ── Get user data (live items only) ────────────────────────
router.get('/api/user-data', requireAuth, asyncHandler(async (req, res) => {
  let doc = await UserData.findOne({ userId: req.session.userId }).lean();
  if (!doc) {
    doc = (await UserData.create({ userId: req.session.userId })).toObject();
  }
  res.json({
    version: doc.version,
    characters: liveItems(doc.characters),
    customMonsters: liveItems(doc.customMonsters),
    encounterPresets: liveItems(doc.encounterPresets),
  });
}));

/**
 * Merge a validated client payload into the user's stored doc using
 * tombstone-aware, rev-ordered merges, with a whole-doc compare-and-swap on
 * `version` (retried) so two concurrent syncs cannot lose each other's merge.
 * Stores tombstones (pruned at TTL); returns the LIVE view. Exported for tests.
 */
export async function mergeUserData(userId, payload, now = Date.now()) {
  for (let attempt = 0; attempt < 4; attempt++) {
    let current = await UserData.findOne({ userId });
    if (!current) current = await UserData.create({ userId });

    const merged = {
      characters: prunedTombstones(mergeCollection(current.characters, payload.characters, 'id'), now),
      customMonsters: prunedTombstones(mergeCollection(current.customMonsters, payload.customMonsters, 'slug'), now),
      encounterPresets: prunedTombstones(mergeCollection(current.encounterPresets, payload.encounterPresets, 'id'), now),
    };

    const doc = await UserData.findOneAndUpdate(
      { userId, version: current.version },
      { $set: merged, $inc: { version: 1 } },
      { returnDocument: 'after' }
    );
    if (doc) {
      return {
        version: doc.version,
        characters: liveItems(doc.characters),
        customMonsters: liveItems(doc.customMonsters),
        encounterPresets: liveItems(doc.encounterPresets),
      };
    }
    // version moved under us → retry with fresh state
  }
  // Extremely unlikely: 4 concurrent writers for one user. We did NOT persist
  // this payload — the client re-syncs on its next cycle. Log it so a real
  // recurrence is visible rather than a silent drop.
  logger.warn({ userId: String(userId) }, 'user-data merge gave up after 4 CAS attempts; payload not persisted this cycle');
  const fresh = await UserData.findOne({ userId }).lean();
  return {
    version: fresh.version,
    characters: liveItems(fresh.characters),
    customMonsters: liveItems(fresh.customMonsters),
    encounterPresets: liveItems(fresh.encounterPresets),
  };
}

// ── Update user data ───────────────────────────────────────
router.put('/api/user-data', requireAuth, requireSubscription, asyncHandler(async (req, res) => {
  const parsed = parseUserDataResilient(req.body);
  if (!parsed.ok) {
    const details = parsed.error.issues.map(i => ({ path: i.path.join('.'), message: i.message }));
    return res.status(400).json({ error: 'Validation failed', details });
  }
  if (parsed.dropped.length) {
    logger.warn({ userId: req.session.userId, dropped: parsed.dropped }, 'user-data sync dropped invalid items');
  }

  const result = await mergeUserData(req.session.userId, parsed.data);
  res.json(result);
}));

export default router;

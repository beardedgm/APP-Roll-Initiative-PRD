import { Router } from 'express';
import mongoose from 'mongoose';
import Encounter from '../models/Encounter.js';
import requireAuth from '../middleware/requireAuth.js';
import requireSubscription from '../middleware/requireSubscription.js';
import validate from '../middleware/validate.js';
import { createEncounterSchema, updateEncounterSchema, listEncountersQuerySchema } from '../validators/encounters.js';
import { flattenQuery } from '../utils/flattenQuery.js';
import { rateLimitMemory } from '../middleware/rateLimitMemory.js';
import asyncHandler from '../utils/asyncHandler.js';
import logger from '../config/logger.js';

const router = Router();

// Validate :id params as MongoDB ObjectId before hitting Mongoose
router.param('id', (req, res, next, id) => {
  if (!/^[a-f\d]{24}$/i.test(id)) {
    return res.status(400).json({ error: 'Invalid encounter ID format' });
  }
  next();
});

// All encounter routes require auth + active subscription (admins bypass)
router.use('/api/encounters', requireAuth, requireSubscription);

// ── List encounters ───────────────────────────────────────────

/**
 * Paginated encounter list for a user. Aggregation projects a $size-computed
 * combatantCount instead of materializing full combatant arrays (up to 100
 * subdocs per encounter) just to count them. Exported for tests.
 */
export async function listEncounters(userId, { limit, skip }) {
  // Aggregation does NOT auto-cast strings to ObjectId like find() does —
  // an un-cast session-string userId would silently match nothing.
  const uid = new mongoose.Types.ObjectId(String(userId));
  const [encounters, total] = await Promise.all([
    Encounter.aggregate([
      { $match: { userId: uid } },
      { $sort: { updatedAt: -1 } }, // served by the { userId: 1, updatedAt: -1 } index
      { $skip: skip },
      { $limit: limit },
      {
        $project: {
          name: 1,
          state: 1,
          currentRound: 1,
          updatedAt: 1,
          rev: 1,
          shareCode: { $ifNull: ['$shareCode', null] },
          combatantCount: { $size: { $ifNull: ['$combatants', []] } },
        },
      },
    ]),
    Encounter.countDocuments({ userId }),
  ]);
  return { encounters, total };
}

router.get('/api/encounters', asyncHandler(async (req, res) => {
  const parsed = listEncountersQuerySchema.safeParse(flattenQuery(req.query));
  if (!parsed.success) {
    const details = parsed.error.issues.map(i => ({ path: i.path.join('.'), message: i.message }));
    return res.status(400).json({ error: 'Validation failed', details });
  }
  const { limit, skip } = parsed.data;

  const { encounters, total } = await listEncounters(req.session.userId, { limit, skip });
  // total/limit/skip let clients page past the cap — the old fixed limit(50)
  // made encounters 51+ invisible with no signal that anything was truncated.
  res.json({ encounters, total, limit, skip });
}));

// ── Get single encounter ──────────────────────────────────────
router.get('/api/encounters/:id', asyncHandler(async (req, res) => {
  const encounter = await Encounter.findOne({
    _id: req.params.id,
    userId: req.session.userId,
  });

  if (!encounter) {
    return res.status(404).json({ error: 'Encounter not found' });
  }

  res.json({ encounter });
}));

// ── Create encounter ──────────────────────────────────────────
router.post('/api/encounters', validate(createEncounterSchema), asyncHandler(async (req, res) => {
  const encounter = await Encounter.create({
    ...req.validated,
    userId: req.session.userId,
  });

  res.status(201).json({ encounter });
}));

// ── Update encounter (used by cloud sync) ─────────────────────
router.put('/api/encounters/:id', validate(updateEncounterSchema), asyncHandler(async (req, res) => {
  const { baseRev, ...updates } = req.validated;
  // Encounters created before the `rev` field existed have no `rev` in Mongo
  // (Mongoose defaults apply on save, not retroactively). A baseRev of 0 must
  // therefore also match a missing field, or every legacy doc would 409-loop
  // on its first sync. $inc treats a missing field as 0, so it becomes 1.
  const revMatch = baseRev === 0
    ? { $or: [{ rev: 0 }, { rev: { $exists: false } }] }
    : { rev: baseRev };
  const encounter = await Encounter.findOneAndUpdate(
    { _id: req.params.id, userId: req.session.userId, ...revMatch },
    { $set: { ...updates, lastSyncedAt: new Date() }, $inc: { rev: 1 } },
    { returnDocument: 'after' }
  );

  if (encounter) {
    return res.json({ encounter });
  }

  // CAS missed: either the encounter is gone (404) or rev moved on (409 conflict)
  const current = await Encounter.findOne({ _id: req.params.id, userId: req.session.userId });
  if (!current) {
    return res.status(404).json({ error: 'Encounter not found' });
  }
  logger.warn({ userId: req.session.userId, id: req.params.id, baseRev, serverRev: current.rev }, 'encounter sync conflict (409)');
  return res.status(409).json({ error: 'Conflict', encounter: current, serverRev: current.rev });
}));

// ── Delete encounter ──────────────────────────────────────────
router.delete('/api/encounters/:id', asyncHandler(async (req, res) => {
  const encounter = await Encounter.findOneAndDelete({
    _id: req.params.id,
    userId: req.session.userId,
  });

  if (!encounter) {
    return res.status(404).json({ error: 'Encounter not found' });
  }

  res.json({ message: 'Encounter deleted' });
}));

// ── Generate share code ───────────────────────────────────────
router.post('/api/encounters/:id/share', asyncHandler(async (req, res) => {
  const encounter = await Encounter.findOne({
    _id: req.params.id,
    userId: req.session.userId,
  });

  if (!encounter) {
    return res.status(404).json({ error: 'Encounter not found' });
  }

  if (!encounter.shareCode) {
    // Targeted update, NOT doc.save(): a full-document save validates the
    // entire legacy doc, so any field predating current schema rules would
    // 400 the share action even though only shareCode is being written (l18).
    // Retry on the unique-index collision (11000); the $exists guard means a
    // concurrent share request can win — adopt its code instead of failing.
    for (let i = 0; i < 5; i++) {
      const code = Encounter.generateShareCode();
      try {
        const updated = await Encounter.findOneAndUpdate(
          { _id: encounter._id, userId: req.session.userId, shareCode: { $exists: false } },
          { $set: { shareCode: code } },
          { new: true }
        ).select('shareCode').lean();
        if (updated) {
          encounter.shareCode = updated.shareCode;
        } else {
          const current = await Encounter.findOne({ _id: encounter._id, userId: req.session.userId })
            .select('shareCode').lean();
          encounter.shareCode = current?.shareCode ?? null;
        }
        break;
      } catch (err) {
        if (err.code !== 11000 || i === 4) throw err;
      }
    }
  }

  res.json({ shareCode: encounter.shareCode });
}));

// ── Remove share code ─────────────────────────────────────────
router.delete('/api/encounters/:id/share', asyncHandler(async (req, res) => {
  const encounter = await Encounter.findOneAndUpdate(
    { _id: req.params.id, userId: req.session.userId },
    { $unset: { shareCode: 1 } },
    { new: true }
  );

  if (!encounter) {
    return res.status(404).json({ error: 'Encounter not found' });
  }

  res.json({ message: 'Share link removed' });
}));

// ── Public: Get shared encounter (no auth required) ───────────
// This route is mounted separately without auth middleware
export const sharedEncounterRouter = Router();

/**
 * Strip a shared dice roll down to what players should see: the result only.
 * The full roll (dice notation label, modifier, individual die faces) would
 * leak a creature's bonuses, so it is never sent to the player view. A `crit`
 * flag is kept so the view can still highlight nat-20 / nat-1 on d20 rolls.
 */
export function toSafeSharedRoll(roll) {
  if (!roll) return null;
  let crit = null;
  if (roll.sides === 20 && Array.isArray(roll.rolls)) {
    if (roll.rolls.includes(20)) crit = 'nat20';
    else if (roll.rolls.includes(1)) crit = 'nat1';
  }
  return { id: roll.id, total: roll.total, timestamp: roll.timestamp, crit };
}

// The player view (useSharedEncounter) polls this endpoint every 2s — that is
// ~450 requests per 15-min window per viewer. A whole table behind one home NAT
// shares an IP, so the old 1000 cap only cleared ~2 players before 429-ing the
// rest ("link expired"). 5000 clears a realistic table (~10 viewers) while still
// stopping abusive flooding. In-memory (not DB-backed): the old rateLimitByIP
// cost a countDocuments + insert per poll — 2 DB ops every 2s per viewer on the
// hottest public endpoint — and its rows also polluted the auth limiter's
// per-IP count. Same per-process tradeoff already accepted for the catalog. See f27.
sharedEncounterRouter.get('/api/shared/:code', rateLimitMemory('shared-encounter', 5000), asyncHandler(async (req, res) => {
  const encounter = await Encounter.findOne({ shareCode: req.params.code })
    .select('name state currentRound activeCreatureId combatants latestSharedRoll updatedAt')
    .lean();

  if (!encounter) {
    return res.status(404).json({ error: 'Encounter not found' });
  }

  // Strip sensitive data — players should see health status but not HP values
  const safeCombatants = (encounter.combatants || []).map(c => {
    // No-HP combatants (legacy/hand-inserted docs) default to healthy (1),
    // not bloody — a 0 fallback landed them in the <=0.25 bucket (l19).
    const hpPct = c.hp && c.hp.max > 0 ? c.hp.current / c.hp.max : 1;
    let healthStatus = 'healthy';
    if (c.status === 'unconscious' || (c.hp && c.hp.current <= 0)) {
      healthStatus = 'unconscious';
    } else if (hpPct <= 0.25) {
      healthStatus = 'bloody';
    } else if (c.hp && c.hp.current < c.hp.max) {
      healthStatus = 'hurt';
    }

    return {
      id: c.id,
      name: c.name,
      type: c.type,
      initiative: c.initiative,
      status: c.status,
      healthStatus,
    };
  });

  res.json({
    encounter: {
      ...encounter,
      combatants: safeCombatants,
      latestSharedRoll: toSafeSharedRoll(encounter.latestSharedRoll),
    },
  });
}));

export default router;

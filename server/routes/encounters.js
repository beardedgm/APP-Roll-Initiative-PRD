import { Router } from 'express';
import Encounter from '../models/Encounter.js';
import requireAuth from '../middleware/requireAuth.js';
import requireSubscription from '../middleware/requireSubscription.js';
import validate from '../middleware/validate.js';
import { createEncounterSchema, updateEncounterSchema } from '../validators/encounters.js';
import { rateLimitByIP } from '../middleware/rateLimitGeneral.js';
import asyncHandler from '../utils/asyncHandler.js';

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
router.get('/api/encounters', asyncHandler(async (req, res) => {
  const encounters = await Encounter.find({ userId: req.session.userId })
    .select('name state currentRound shareCode combatants updatedAt')
    .sort({ updatedAt: -1 })
    .limit(50)
    .lean();

  // Add combatant count for list display
  const list = encounters.map(e => ({
    _id: e._id,
    name: e.name,
    state: e.state,
    currentRound: e.currentRound,
    shareCode: e.shareCode || null,
    combatantCount: e.combatants?.length || 0,
    updatedAt: e.updatedAt,
  }));

  res.json({ encounters: list });
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
  const encounter = await Encounter.findOneAndUpdate(
    { _id: req.params.id, userId: req.session.userId },
    { ...req.validated, lastSyncedAt: new Date() },
    { new: true }
  );

  if (!encounter) {
    return res.status(404).json({ error: 'Encounter not found' });
  }

  res.json({ encounter });
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
    // Try up to 3 times in case of collision
    for (let i = 0; i < 5; i++) {
      try {
        encounter.shareCode = Encounter.generateShareCode();
        await encounter.save();
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

// The player view (useSharedEncounter) polls this endpoint every 2s — that is
// ~450 requests per 15-min window for a single viewer. The cap must comfortably
// exceed that (and leave room for a few viewers behind one NAT) while still
// stopping abusive scraping/flooding of this public, unauthenticated route.
sharedEncounterRouter.get('/api/shared/:code', rateLimitByIP('shared-encounter', 1000), asyncHandler(async (req, res) => {
  const encounter = await Encounter.findOne({ shareCode: req.params.code })
    .select('name state currentRound activeCreatureId combatants latestSharedRoll updatedAt')
    .lean();

  if (!encounter) {
    return res.status(404).json({ error: 'Encounter not found' });
  }

  // Strip sensitive data — players should see health status but not HP values
  const safeCombatants = (encounter.combatants || []).map(c => {
    const hpPct = c.hp && c.hp.max > 0 ? c.hp.current / c.hp.max : 0;
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
      latestSharedRoll: encounter.latestSharedRoll || null,
    },
  });
}));

export default router;

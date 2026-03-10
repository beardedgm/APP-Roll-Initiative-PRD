import { Router } from 'express';
import Encounter from '../models/Encounter.js';
import requireAuth from '../middleware/requireAuth.js';
import requireSubscription from '../middleware/requireSubscription.js';
import validate from '../middleware/validate.js';
import { createEncounterSchema, updateEncounterSchema } from '../validators/encounters.js';
import logger from '../config/logger.js';

const router = Router();

// All encounter routes require auth + active subscription (admins bypass)
router.use('/api/encounters', requireAuth, requireSubscription);

// ── List encounters ───────────────────────────────────────────
router.get('/api/encounters', async (req, res) => {
  try {
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
  } catch (err) {
    logger.error({ err }, 'Failed to list encounters');
    res.status(500).json({ error: 'Failed to list encounters' });
  }
});

// ── Get single encounter ──────────────────────────────────────
router.get('/api/encounters/:id', async (req, res) => {
  try {
    const encounter = await Encounter.findOne({
      _id: req.params.id,
      userId: req.session.userId,
    });

    if (!encounter) {
      return res.status(404).json({ error: 'Encounter not found' });
    }

    res.json({ encounter });
  } catch (err) {
    logger.error({ err }, 'Failed to get encounter');
    res.status(500).json({ error: 'Failed to get encounter' });
  }
});

// ── Create encounter ──────────────────────────────────────────
router.post('/api/encounters', validate(createEncounterSchema), async (req, res) => {
  try {
    const encounter = await Encounter.create({
      ...req.validated,
      userId: req.session.userId,
    });

    res.status(201).json({ encounter });
  } catch (err) {
    logger.error({ err }, 'Failed to create encounter');
    res.status(500).json({ error: 'Failed to create encounter' });
  }
});

// ── Update encounter (used by cloud sync) ─────────────────────
router.put('/api/encounters/:id', validate(updateEncounterSchema), async (req, res) => {
  try {
    const encounter = await Encounter.findOneAndUpdate(
      { _id: req.params.id, userId: req.session.userId },
      { ...req.validated, lastSyncedAt: new Date() },
      { new: true }
    );

    if (!encounter) {
      return res.status(404).json({ error: 'Encounter not found' });
    }

    res.json({ encounter });
  } catch (err) {
    logger.error({ err }, 'Failed to update encounter');
    res.status(500).json({ error: 'Failed to update encounter' });
  }
});

// ── Delete encounter ──────────────────────────────────────────
router.delete('/api/encounters/:id', async (req, res) => {
  try {
    const encounter = await Encounter.findOneAndDelete({
      _id: req.params.id,
      userId: req.session.userId,
    });

    if (!encounter) {
      return res.status(404).json({ error: 'Encounter not found' });
    }

    res.json({ message: 'Encounter deleted' });
  } catch (err) {
    logger.error({ err }, 'Failed to delete encounter');
    res.status(500).json({ error: 'Failed to delete encounter' });
  }
});

// ── Generate share code ───────────────────────────────────────
router.post('/api/encounters/:id/share', async (req, res) => {
  try {
    const encounter = await Encounter.findOne({
      _id: req.params.id,
      userId: req.session.userId,
    });

    if (!encounter) {
      return res.status(404).json({ error: 'Encounter not found' });
    }

    if (!encounter.shareCode) {
      // Try up to 3 times in case of collision
      for (let i = 0; i < 3; i++) {
        try {
          encounter.shareCode = Encounter.generateShareCode();
          await encounter.save();
          break;
        } catch (err) {
          if (err.code !== 11000 || i === 2) throw err;
        }
      }
    }

    res.json({ shareCode: encounter.shareCode });
  } catch (err) {
    logger.error({ err }, 'Failed to generate share code');
    res.status(500).json({ error: 'Failed to generate share code' });
  }
});

// ── Remove share code ─────────────────────────────────────────
router.delete('/api/encounters/:id/share', async (req, res) => {
  try {
    const encounter = await Encounter.findOneAndUpdate(
      { _id: req.params.id, userId: req.session.userId },
      { $unset: { shareCode: 1 } },
      { new: true }
    );

    if (!encounter) {
      return res.status(404).json({ error: 'Encounter not found' });
    }

    res.json({ message: 'Share link removed' });
  } catch (err) {
    logger.error({ err }, 'Failed to remove share code');
    res.status(500).json({ error: 'Failed to remove share code' });
  }
});

// ── Public: Get shared encounter (no auth required) ───────────
// This route is mounted separately without auth middleware
export const sharedEncounterRouter = Router();

sharedEncounterRouter.get('/api/shared/:code', async (req, res) => {
  try {
    const encounter = await Encounter.findOne({ shareCode: req.params.code })
      .select('name state currentRound activeCreatureId combatants updatedAt')
      .lean();

    if (!encounter) {
      return res.status(404).json({ error: 'Encounter not found' });
    }

    res.json({ encounter });
  } catch (err) {
    logger.error({ err }, 'Failed to get shared encounter');
    res.status(500).json({ error: 'Failed to get shared encounter' });
  }
});

export default router;

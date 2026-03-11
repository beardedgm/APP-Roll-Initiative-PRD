import { Router } from 'express';
import crypto from 'crypto';
import mongoose from 'mongoose';
import Monster from '../models/Monster.js';
import logger from '../config/logger.js';
import requireAuth from '../middleware/requireAuth.js';
import requireSubscription from '../middleware/requireSubscription.js';
import validate from '../middleware/validate.js';
import { createMonsterSchema, updateMonsterSchema } from '../validators/monsters.js';

const router = Router();

/** Helper: parse CR string to numeric */
function crToNumeric(crStr) {
  if (!crStr) return undefined;
  if (crStr.includes('/')) {
    const [num, den] = crStr.split('/').map(Number);
    return den ? num / den : 0;
  }
  return parseFloat(crStr);
}

/** Helper: generate slug for custom monsters */
function generateCustomSlug(name) {
  const base = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const rand = crypto.randomBytes(3).toString('hex');
  return `custom-${base}-${rand}`;
}

/**
 * GET /api/monsters/search?q=goblin&source=5.1_srd&cr=1/4&type=beast&limit=20&skip=0
 * Public — no auth required. Includes user's custom monsters when authenticated.
 */
router.get('/api/monsters/search', async (req, res) => {
  try {
    const { q, source, cr, type, limit = 20, skip = 0 } = req.query;
    const filter = {};

    if (q && q.trim()) {
      const escaped = q.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.name = new RegExp(escaped, 'i');
    }

    if (source) {
      filter.sourceKey = source;
    }

    if (cr !== undefined && cr !== '') {
      const crStr = cr.trim();
      filter.crNumeric = crToNumeric(crStr);
    }

    if (type && type.trim()) {
      const escapedType = type.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.type = new RegExp(escapedType, 'i');
    }

    const lim = Math.min(parseInt(limit) || 20, 50);
    const sk = Math.max(parseInt(skip) || 0, 0);

    // Include user's custom monsters alongside seeded ones.
    // Custom monsters have sourceKey='custom'. Use sourceKey (string) to filter
    // instead of isCustom (boolean) to avoid Mongoose 9 sanitizeFilter cast issues.
    const userId = req.session?.userId;
    if (userId && !source) {
      // No source filter: show all seeded + user's custom via two queries
      const select = 'name slug source sourceKey cr crNumeric hp ac initMod size type alignment isCustom';
      const seededFilter = { ...filter, sourceKey: mongoose.trusted({ $ne: 'custom' }) };
      const customFilter = { ...filter, sourceKey: 'custom', createdBy: userId };

      const [seeded, custom, seededCount, customCount] = await Promise.all([
        Monster.find(seededFilter).select(select).sort({ name: 1 }).skip(sk).limit(lim),
        Monster.find(customFilter).select(select).sort({ name: 1 }),
        Monster.countDocuments(seededFilter),
        Monster.countDocuments(customFilter),
      ]);

      const merged = [...seeded, ...custom].sort((a, b) => a.name.localeCompare(b.name)).slice(0, lim);
      return res.json({ results: merged, total: seededCount + customCount, limit: lim, skip: sk });
    } else if (userId && source === 'custom') {
      filter.sourceKey = 'custom';
      filter.createdBy = userId;
    } else if (!userId && !source) {
      filter.sourceKey = mongoose.trusted({ $ne: 'custom' });
    } else if (!userId && source === 'custom') {
      return res.json({ results: [], total: 0, limit: lim, skip: sk });
    }

    const [monsters, total] = await Promise.all([
      Monster.find(filter)
        .select('name slug source sourceKey cr crNumeric hp ac initMod size type alignment isCustom')
        .sort({ name: 1 })
        .skip(sk)
        .limit(lim),
      Monster.countDocuments(filter),
    ]);

    res.json({ results: monsters, total, limit: lim, skip: sk });
  } catch (err) {
    logger.error({ err }, 'Monster search failed');
    res.status(500).json({ error: 'Search failed' });
  }
});

/**
 * GET /api/monsters/sources — list all unique sourceKeys with labels
 */
router.get('/api/monsters/sources', async (req, res) => {
  try {
    const userId = req.session?.userId;
    const matchStage = userId
      ? { $or: [{ isCustom: { $ne: true } }, { isCustom: true, createdBy: new mongoose.Types.ObjectId(userId) }] }
      : { isCustom: { $ne: true } };

    const pipeline = [
      { $match: matchStage },
      { $group: { _id: '$sourceKey', label: { $first: '$source' }, count: { $sum: 1 } } },
      { $sort: { label: 1 } },
    ];
    const sources = await Monster.aggregate(pipeline);
    res.json(sources.map(s => ({ key: s._id, label: s.label, count: s.count })));
  } catch (_err) {
    res.status(500).json({ error: 'Failed to get sources' });
  }
});

/**
 * GET /api/monsters/:slug
 * Returns full document. Custom monsters visible to owner only (unless public).
 */
router.get('/api/monsters/:slug', async (req, res) => {
  try {
    const monster = await Monster.findOne({ slug: req.params.slug });
    if (!monster) {
      return res.status(404).json({ error: 'Monster not found' });
    }

    // Custom monsters: only owner or public
    if (monster.isCustom && !monster.isPublic) {
      const userId = req.session?.userId;
      if (!userId || monster.createdBy?.toString() !== userId) {
        return res.status(404).json({ error: 'Monster not found' });
      }
    }

    res.json(monster);
  } catch (err) {
    logger.error({ err }, 'Monster fetch failed');
    res.status(500).json({ error: 'Fetch failed' });
  }
});

/**
 * POST /api/monsters — create custom monster (premium)
 */
router.post('/api/monsters', requireSubscription, validate(createMonsterSchema), async (req, res) => {
  try {
    const data = req.validated;
    const slug = generateCustomSlug(data.name);

    const monster = await Monster.create({
      ...data,
      slug,
      source: 'Custom',
      sourceKey: 'custom',
      crNumeric: crToNumeric(data.cr),
      isCustom: true,
      createdBy: req.session.userId,
    });

    logger.info({ userId: req.session.userId, monsterSlug: slug }, 'Custom monster created');
    res.status(201).json(monster);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ error: 'Slug collision — please try again' });
    }
    logger.error({ err }, 'Custom monster creation failed');
    res.status(500).json({ error: 'Creation failed' });
  }
});

/**
 * PUT /api/monsters/:slug — update custom monster (owner only)
 */
router.put('/api/monsters/:slug', requireAuth, validate(updateMonsterSchema), async (req, res) => {
  try {
    const monster = await Monster.findOne({ slug: req.params.slug, isCustom: true });
    if (!monster) {
      return res.status(404).json({ error: 'Custom monster not found' });
    }
    if (monster.createdBy?.toString() !== req.session.userId) {
      return res.status(403).json({ error: 'Not your monster' });
    }

    const data = req.validated;
    Object.assign(monster, data);
    if (data.cr !== undefined) {
      monster.crNumeric = crToNumeric(data.cr);
    }
    await monster.save();

    logger.info({ userId: req.session.userId, monsterSlug: monster.slug }, 'Custom monster updated');
    res.json(monster);
  } catch (err) {
    logger.error({ err }, 'Custom monster update failed');
    res.status(500).json({ error: 'Update failed' });
  }
});

/**
 * DELETE /api/monsters/:slug — delete custom monster (owner only)
 */
router.delete('/api/monsters/:slug', requireAuth, async (req, res) => {
  try {
    const monster = await Monster.findOne({ slug: req.params.slug, isCustom: true });
    if (!monster) {
      return res.status(404).json({ error: 'Custom monster not found' });
    }
    if (monster.createdBy?.toString() !== req.session.userId) {
      return res.status(403).json({ error: 'Not your monster' });
    }

    await monster.deleteOne();
    logger.info({ userId: req.session.userId, monsterSlug: req.params.slug }, 'Custom monster deleted');
    res.json({ success: true });
  } catch (err) {
    logger.error({ err }, 'Custom monster deletion failed');
    res.status(500).json({ error: 'Deletion failed' });
  }
});

export default router;

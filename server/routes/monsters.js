import { Router } from 'express';
import Monster from '../models/Monster.js';
import logger from '../config/logger.js';

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

/**
 * GET /api/monsters/search?q=goblin&source=5.1_srd&cr=1/4&type=beast&limit=20&skip=0
 * Public — returns seeded (non-custom) monsters only.
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

    // Exclude custom monsters — they now live in UserData
    if (!filter.sourceKey) {
      filter.isCustom = { $ne: true };
    }

    const lim = Math.min(parseInt(limit) || 20, 50);
    const sk = Math.max(parseInt(skip) || 0, 0);

    const [monsters, total] = await Promise.all([
      Monster.find(filter)
        .select('name slug source sourceKey cr crNumeric hp ac initMod size type alignment')
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
 * GET /api/monsters/sources — list all unique sourceKeys with labels (seeded only)
 */
router.get('/api/monsters/sources', async (req, res) => {
  try {
    const pipeline = [
      { $match: { isCustom: { $ne: true } } },
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
 * GET /api/monsters/:slug — full stat block for seeded monsters
 */
router.get('/api/monsters/:slug', async (req, res) => {
  try {
    const monster = await Monster.findOne({ slug: req.params.slug, isCustom: { $ne: true } });
    if (!monster) {
      return res.status(404).json({ error: 'Monster not found' });
    }
    res.json(monster);
  } catch (err) {
    logger.error({ err }, 'Monster fetch failed');
    res.status(500).json({ error: 'Fetch failed' });
  }
});

export default router;

import { Router } from 'express';
import Monster from '../models/Monster.js';
import logger from '../config/logger.js';

const router = Router();

/**
 * GET /api/monsters/search?q=goblin&source=5.1_srd&cr=1/4&type=beast&limit=20&skip=0
 * Public — no auth required. Supports browsing with pagination.
 */
router.get('/api/monsters/search', async (req, res) => {
  try {
    const { q, source, cr, type, limit = 20, skip = 0 } = req.query;
    const filter = {};

    if (q && q.trim()) {
      // Use native RegExp (sanitizeFilter strips $regex operators)
      const escaped = q.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.name = new RegExp(escaped, 'i');
    }

    if (source) {
      filter.sourceKey = source;
    }

    if (cr !== undefined && cr !== '') {
      const crStr = cr.trim();
      if (crStr.includes('/')) {
        const [num, den] = crStr.split('/').map(Number);
        filter.crNumeric = den ? num / den : 0;
      } else {
        filter.crNumeric = parseFloat(crStr);
      }
    }

    if (type && type.trim()) {
      const escapedType = type.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.type = new RegExp(escapedType, 'i');
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
 * GET /api/monsters/sources — list all unique sourceKeys with labels
 */
router.get('/api/monsters/sources', async (_req, res) => {
  try {
    const sources = await Monster.aggregate([
      { $group: { _id: '$sourceKey', label: { $first: '$source' }, count: { $sum: 1 } } },
      { $sort: { label: 1 } },
    ]);
    res.json(sources.map(s => ({ key: s._id, label: s.label, count: s.count })));
  } catch (err) {
    res.status(500).json({ error: 'Failed to get sources' });
  }
});

/**
 * GET /api/monsters/:slug
 * Returns full document including rawMarkdown.
 */
router.get('/api/monsters/:slug', async (req, res) => {
  try {
    const monster = await Monster.findOne({ slug: req.params.slug });
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

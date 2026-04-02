import { Router } from 'express';
import Monster from '../models/Monster.js';
import logger from '../config/logger.js';
import asyncHandler from '../utils/asyncHandler.js';

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
router.get('/api/monsters/search', asyncHandler(async (req, res) => {
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
}));

/**
 * GET /api/monsters/sources — list all unique sourceKeys with labels (seeded only)
 */
router.get('/api/monsters/sources', asyncHandler(async (req, res) => {
  const pipeline = [
    { $match: { isCustom: { $ne: true } } },
    { $group: { _id: '$sourceKey', label: { $first: '$source' }, count: { $sum: 1 } } },
    { $sort: { label: 1 } },
  ];
  const sources = await Monster.aggregate(pipeline);
  res.json(sources.map(s => ({ key: s._id, label: s.label, count: s.count })));
}));

/**
 * GET /api/monsters/:slug — full stat block for seeded monsters
 */
router.get('/api/monsters/:slug', asyncHandler(async (req, res) => {
  // M-8: Validate slug format (alphanumeric + hyphens, max 200 chars)
  if (!/^[a-z0-9-]{1,200}$/i.test(req.params.slug)) {
    return res.status(400).json({ error: 'Invalid slug format' });
  }

  const monster = await Monster.findOne({ slug: req.params.slug, isCustom: { $ne: true } });
  if (!monster) {
    return res.status(404).json({ error: 'Monster not found' });
  }
  res.json(monster);
}));

export default router;

import { Router } from 'express';
import Spell from '../models/Spell.js';
import asyncHandler from '../utils/asyncHandler.js';

const router = Router();

/**
 * GET /api/spells/search?q=fire&source=5.1_srd&level=3&school=evocation&limit=20&skip=0&gameSystem=5e
 * Public — returns seeded spells.
 */
router.get('/api/spells/search', asyncHandler(async (req, res) => {
  const { q, source, level, school, tradition, limit = 20, skip = 0, gameSystem = '5e' } = req.query;
  const filter = { gameSystem };

  if (q && q.trim()) {
    const escaped = q.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    filter.name = new RegExp(escaped, 'i');
  }

  if (source) {
    filter.sourceKey = source;
  }

  if (level !== undefined && level !== '') {
    filter.level = parseInt(level);
  }

  if (school && school.trim()) {
    const escapedSchool = school.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    filter.school = new RegExp(escapedSchool, 'i');
  }

  // PF2e: filter by tradition (stored in classes array)
  if (tradition && tradition.trim()) {
    filter.classes = tradition.trim().toLowerCase();
  }

  const lim = Math.min(parseInt(limit) || 20, 50);
  const sk = Math.max(parseInt(skip) || 0, 0);

  const [spells, total] = await Promise.all([
    Spell.find(filter)
      .select('name slug source sourceKey gameSystem level school classes castingTime range components duration')
      .sort({ name: 1 })
      .skip(sk)
      .limit(lim),
    Spell.countDocuments(filter),
  ]);

  res.json({ results: spells, total, limit: lim, skip: sk });
}));

/**
 * GET /api/spells/sources — list all unique sourceKeys with labels
 */
router.get('/api/spells/sources', asyncHandler(async (req, res) => {
  const { gameSystem = '5e' } = req.query;
  const pipeline = [
    { $match: { gameSystem } },
    { $group: { _id: '$sourceKey', label: { $first: '$source' }, count: { $sum: 1 } } },
    { $sort: { label: 1 } },
  ];
  const sources = await Spell.aggregate(pipeline);
  res.json(sources.map(s => ({ key: s._id, label: s.label, count: s.count })));
}));

/**
 * GET /api/spells/:slug — full spell with rawMarkdown
 */
router.get('/api/spells/:slug', asyncHandler(async (req, res) => {
  if (!/^[a-z0-9._-]{1,200}$/i.test(req.params.slug)) {
    return res.status(400).json({ error: 'Invalid slug format' });
  }

  const spell = await Spell.findOne({ slug: req.params.slug });
  if (!spell) {
    return res.status(404).json({ error: 'Spell not found' });
  }
  res.json(spell);
}));

export default router;

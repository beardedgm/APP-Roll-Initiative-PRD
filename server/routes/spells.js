import { Router } from 'express';
import Spell from '../models/Spell.js';
import asyncHandler from '../utils/asyncHandler.js';
import { flattenQuery } from '../utils/flattenQuery.js';
import { rateLimitMemory } from '../middleware/rateLimitMemory.js';

const router = Router();

// Same in-memory per-IP cap as the monster catalog, with its own budget so
// heavy monster browsing can't starve spell lookups (f12). MUST be path-scoped:
// this router is mounted at the app root, so a pathless router.use would count
// every request in the app against the cap.
router.use('/api/spells', rateLimitMemory('catalog-spells', 2000));

/**
 * GET /api/spells/search?q=fire&source=5.1_srd&level=3&school=evocation&limit=20&skip=0&gameSystem=5e
 * Public — returns seeded spells.
 */
router.get('/api/spells/search', asyncHandler(async (req, res) => {
  const { q, source, level, school, tradition, category, spellType, actionCost, limit = 20, skip = 0, gameSystem = '5e' } = flattenQuery(req.query);
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
    // Guard NaN: a Mongoose CastError would surface as "Invalid ID format".
    if (Number.isNaN(filter.level)) {
      return res.status(400).json({ error: 'Invalid level value' });
    }
  }

  if (school && school.trim()) {
    const escapedSchool = school.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    filter.school = new RegExp(escapedSchool, 'i');
  }

  // PF2e: filter by tradition (using proper traditions field)
  if (tradition && tradition.trim()) {
    filter.traditions = tradition.trim().toLowerCase();
  }

  // PF2e: category filter (tradition or spell type)
  if (category && category.trim()) {
    const cat = category.trim().toLowerCase();
    if (cat === 'focus' || cat === 'ritual') {
      filter.spellType = cat;
    } else {
      filter.traditions = cat;
    }
  }

  // PF2e: filter by spell type
  if (spellType && spellType.trim()) {
    filter.spellType = spellType.trim().toLowerCase();
  }

  // PF2e: filter by action cost
  if (actionCost && actionCost.trim()) {
    filter.actionCost = actionCost.trim();
  }

  const lim = Math.min(parseInt(limit) || 20, 50);
  const sk = Math.max(parseInt(skip) || 0, 0);

  const [spells, total] = await Promise.all([
    Spell.find(filter)
      .select('name slug source sourceKey gameSystem level school classes castingTime range components duration traditions traits actionCost spellType rarity')
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
 * GET /api/spells/names?gameSystem=pf2e
 * Lightweight endpoint returning only name + slug for spell linking.
 */
router.get('/api/spells/names', asyncHandler(async (req, res) => {
  const { gameSystem = '5e' } = req.query;
  // Deliberately NOT paginated: ContentViewer's spell-linking needs the
  // complete name index per system (~1,540 5e / ~2,060 PF2e) to match spell
  // names inside stat blocks — a cap would silently break links. The .limit
  // is a sanity bound far above any real catalog size, so a seeding bug
  // can't turn this into a multi-MB response.
  const spells = await Spell.find({ gameSystem })
    .select('name slug')
    .sort({ name: 1 })
    .limit(5000)
    .lean();
  // Identical for all users (public, unpersonalized) and changes only at
  // deploy/seed time; the client already holds it with staleTime: 1h.
  res.set('Cache-Control', 'public, max-age=3600');
  res.json(spells);
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

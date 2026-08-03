import { Router } from 'express';
import Monster from '../models/Monster.js';
import User from '../models/User.js';
import { DEMO_SLUGS } from '../config/demoMonsters.js';
import asyncHandler from '../utils/asyncHandler.js';
import { flattenQuery } from '../utils/flattenQuery.js';
import { rateLimitMemory } from '../middleware/rateLimitMemory.js';

const router = Router();

// Cap per-IP request volume on the public catalog (generous for real browsing,
// stops anonymous scraping / DB exhaustion) without a DB hit per request (f12).
// MUST be path-scoped: this router is mounted at the app root, so a pathless
// router.use would count (and eventually 429) every request in the app —
// including the SPA shell and static assets.
router.use('/api/monsters', rateLimitMemory('catalog-monsters', 2000));

async function hasFullAccess(req) {
  if (!req.session?.userId) return false;
  const user = await User.findById(req.session.userId).select('subscriptionStatus role').lean();
  if (!user) return false;
  return user.role === 'owner' || user.subscriptionStatus === 'active';
}

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

  const { q, source, cr, type, limit = 20, skip = 0, gameSystem = '5e' } = flattenQuery(req.query);
  const filter = {};

  filter.gameSystem = gameSystem;

  if (q && q.trim()) {
    const escaped = q.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    filter.name = new RegExp(escaped, 'i');
  }

  if (source) {
    filter.sourceKey = source;
  }

  if (cr !== undefined && cr !== '') {
    const crStr = cr.trim();
    if (gameSystem === 'pf2e') {
      filter.crNumeric = parseInt(crStr);
    } else {
      filter.crNumeric = crToNumeric(crStr);
    }
  }

  if (type && type.trim()) {
    const escapedType = type.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    filter.type = new RegExp(escapedType, 'i');
  }

  // Exclude custom monsters — they live in UserData; any isCustom doc still in
  // the Monster collection is legacy/foreign and must never be served publicly.
  // Unconditional: gating this on sourceKey let ?source=custom (or any source)
  // skip the exclusion and list other users' legacy custom monsters.
  filter.isCustom = false;

  const fullAccess = await hasFullAccess(req);
  if (!fullAccess) {
    filter.slug = { $in: [...DEMO_SLUGS] };
  }

  const lim = Math.min(parseInt(limit) || 20, 50);
  const sk = Math.max(parseInt(skip) || 0, 0);

  const [monsters, total] = await Promise.all([
    Monster.find(filter)
      .select('name slug source sourceKey gameSystem cr crNumeric hp ac initMod size type alignment')
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
  const { gameSystem = '5e' } = req.query;
  const pipeline = [
    { $match: { isCustom: false, gameSystem } },
    { $group: { _id: '$sourceKey', label: { $first: '$source' }, count: { $sum: 1 } } },
    { $sort: { label: 1 } },
  ];
  const sources = await Monster.aggregate(pipeline);
  const mapped = sources.map(s => ({ key: s._id, label: s.label, count: s.count }));

  const fullAccess = await hasFullAccess(req);
  if (!fullAccess) {
    // Non-subscribers see only demo-relevant SOURCES, but the counts are
    // deliberately the full per-source totals (e.g. "5.1 SRD (300)") even
    // though only the demo slugs are fetchable — intentional catalog-size
    // marketing, not a gating bug. Reviewed and kept as-is (l21 wontfix).
    const demoSources = new Set([...DEMO_SLUGS].map(s => s.split('--')[0]));
    const filtered = mapped.filter(s => demoSources.has(s.key));
    return res.json(filtered);
  }

  res.json(mapped);
}));

/**
 * GET /api/monsters/:slug — full stat block for seeded monsters
 */
router.get('/api/monsters/:slug', asyncHandler(async (req, res) => {

  // M-8: Validate slug format (alphanumeric + hyphens + underscores, max 200 chars)
  if (!/^[a-z0-9._-]{1,200}$/i.test(req.params.slug)) {
    return res.status(400).json({ error: 'Invalid slug format' });
  }

  const monster = await Monster.findOne({ slug: req.params.slug, isCustom: false });
  if (!monster) {
    return res.status(404).json({ error: 'Monster not found' });
  }

  if (!await hasFullAccess(req)) {
    if (!DEMO_SLUGS.has(monster.slug)) {
      return res.status(403).json({ error: 'Full monster library requires a subscription' });
    }
  }

  res.json(monster);
}));

export default router;

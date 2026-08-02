import { z } from 'zod';

const presetCombatantSchema = z.object({
  id: z.string(),
  name: z.string().max(100),
  type: z.enum(['player', 'monster', 'npc']).default('monster'),
  initiative: z.number().default(0),
  initiativeModifier: z.number().default(0),
  ac: z.number().min(0).max(99).default(10),
  hp: z.object({
    current: z.number().int().min(0).max(99999),
    max: z.number().int().min(1).max(99999),
  }),
  status: z.enum(['normal', 'unconscious']).default('normal'),
  monsterSlug: z.string().optional(),
});

const presetDiceHistoryEntrySchema = z.object({
  id: z.string(),
  sides: z.number().int().positive(),
  count: z.number().int().positive(),
  modifier: z.number().int(),
  advantage: z.enum(['normal', 'advantage', 'disadvantage']),
  rolls: z.array(z.number().int()).max(20),
  total: z.number().int(),
});

const characterSchema = z.object({
  id: z.string().min(1).max(100).regex(/^[\w-]+$/, 'ID must contain only word characters and hyphens'),
  name: z.string().min(1).max(100),
  type: z.enum(['player', 'npc']).default('player'),
  maxHP: z.number().int().min(1).max(99999).nullable().default(null),
  ac: z.number().int().min(0).max(99).default(10),
  // 5e: DEX modifier. PF2e: Perception, which reaches ~+25..+40 at high level.
  // Must match customMonsterSchema (50) — a too-narrow bound silently drops the
  // character on sync and then deletes it from the device on the round-trip.
  initMod: z.number().int().min(-10).max(50).default(0),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
  rev: z.number().int().min(0).optional().default(0),
  deleted: z.boolean().optional().default(false),
  deletedAt: z.string().optional(),
});

const entrySchema = z.object({
  name: z.string().max(500),
  description: z.string().max(10000),
});

const customMonsterSchema = z.object({
  slug: z.string().min(1).max(200).regex(/^[a-z0-9._-]+$/, 'Slug must contain only lowercase letters, numbers, dots, hyphens, and underscores'),
  name: z.string().min(1).max(100),
  isCustom: z.boolean().optional().default(true),
  sourceKey: z.string().max(50).optional().default('custom'),
  source: z.string().max(50).optional().default('Custom'),
  gameSystem: z.enum(['5e', 'pf2e']).optional().default('5e'),
  size: z.string().max(50).optional(),
  type: z.string().max(100).optional(),
  alignment: z.string().max(100).optional(),
  // AC up to 99 to match the form input; high-level PF2e/5e creatures exceed 30.
  ac: z.number().int().min(0).max(99).optional(),
  acDesc: z.string().max(200).optional(),
  hp: z.number().int().min(1).max(99999).optional(),
  hpFormula: z.string().max(50).optional(),
  speed: z.string().max(200).optional(),
  // Stores 5e ability SCORES (1-30) OR PF2e ability MODIFIERS (negative..+12).
  // The range must accept both systems — one bad value here 400s the whole
  // user-data sync, silently blocking ALL custom data from reaching the cloud.
  abilities: z.object({
    str: z.number().int().min(-10).max(30).optional(),
    dex: z.number().int().min(-10).max(30).optional(),
    con: z.number().int().min(-10).max(30).optional(),
    int: z.number().int().min(-10).max(30).optional(),
    wis: z.number().int().min(-10).max(30).optional(),
    cha: z.number().int().min(-10).max(30).optional(),
  }).optional(),
  savingThrows: z.string().max(500).optional(),
  skills: z.string().max(500).optional(),
  damageResistances: z.string().max(500).optional(),
  damageImmunities: z.string().max(500).optional(),
  damageVulnerabilities: z.string().max(500).optional(),
  conditionImmunities: z.string().max(500).optional(),
  senses: z.string().max(500).optional(),
  languages: z.string().max(500).optional(),
  cr: z.string().max(10).optional(),
  // 5e: DEX modifier (-5..+10). PF2e: Perception (-10..+50 via the form).
  initMod: z.number().int().min(-10).max(50).optional(),
  traits: z.array(entrySchema).max(50).optional().default([]),
  actions: z.array(entrySchema).max(50).optional().default([]),
  reactions: z.array(entrySchema).max(50).optional().default([]),
  legendaryActions: z.array(entrySchema).max(50).optional().default([]),
  rawMarkdown: z.string().max(50000).optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
  rev: z.number().int().min(0).optional().default(0),
  deleted: z.boolean().optional().default(false),
  deletedAt: z.string().optional(),
});

const encounterPresetSchema = z.object({
  id: z.string().min(1).max(100).regex(/^[\w-]+$/, 'ID must contain only word characters and hyphens'),
  name: z.string().min(1).max(100),
  combatants: z.array(presetCombatantSchema).max(100).default([]),
  state: z.enum(['pre-combat', 'combat']).default('pre-combat'),
  currentRound: z.number().int().min(1).default(1),
  activeCreatureId: z.string().nullable().default(null),
  diceHistory: z.array(presetDiceHistoryEntrySchema).max(50).default([]),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
  rev: z.number().int().min(0).optional().default(0),
  deleted: z.boolean().optional().default(false),
  deletedAt: z.string().optional(),
});

export const updateUserDataSchema = z.object({
  version: z.number().int().min(0),
  characters: z.array(characterSchema).max(500).default([]),
  customMonsters: z.array(customMonsterSchema).max(500).default([]),
  encounterPresets: z.array(encounterPresetSchema).max(500).default([]),
});

// Envelope-level checks only: version is sane and each collection is an array
// within the flood cap. Individual items are validated separately so one bad
// record can't 400 the whole sync.
//
// The 2000 cap is a pure FLOOD cap, not the product limit. The product limit
// (500 live items per collection) is enforced client-side at creation time —
// the sync payload is live items PLUS pending deletion tombstones, and
// tombstones only clear after a successful sync while a 4xx is deliberately
// not retried. An envelope cap at the product limit therefore deadlocks the
// sync permanently once a user near the cap deletes-and-adds (500 live + N
// tombstones → 400 → tombstones never clear → every future sync 400s). The
// envelope must always exceed live cap + worst-case pending tombstones.
const userDataEnvelopeSchema = z.object({
  version: z.number().int().min(0),
  characters: z.array(z.unknown()).max(2000).default([]),
  customMonsters: z.array(z.unknown()).max(2000).default([]),
  encounterPresets: z.array(z.unknown()).max(2000).default([]),
});

const ITEM_SCHEMAS = {
  characters: characterSchema,
  customMonsters: customMonsterSchema,
  encounterPresets: encounterPresetSchema,
};

/**
 * Validate a user-data sync payload resiliently: the envelope (version + array
 * shape + flood cap) must be well-formed, but individual items are validated
 * one at a time. Valid items are kept (parsed/stripped); invalid ones are
 * dropped and reported in `dropped` rather than failing the whole request.
 *
 * Why: PUT /api/user-data validates the entire batch, and a single bad record
 * used to 400 the request — silently blocking ALL of a user's cloud sync
 * (custom monsters, characters, AND encounter presets). One corrupt item must
 * never blackhole an otherwise-valid sync.
 *
 * Returns { ok: false, error } on envelope failure (caller sends 400), or
 * { ok: true, data, dropped } where data holds only the valid items and
 * dropped lists what was skipped ({ collection, index, name, issues }).
 */
export function parseUserDataResilient(body) {
  const env = userDataEnvelopeSchema.safeParse(body);
  if (!env.success) return { ok: false, error: env.error };

  const dropped = [];
  const data = { version: env.data.version };

  for (const collection of Object.keys(ITEM_SCHEMAS)) {
    const schema = ITEM_SCHEMAS[collection];
    const valid = [];
    env.data[collection].forEach((item, index) => {
      const result = schema.safeParse(item);
      if (result.success) {
        valid.push(result.data);
      } else {
        dropped.push({
          collection,
          index,
          name: item && typeof item === 'object' ? item.name : undefined,
          issues: result.error.issues.map(i => `${i.path.join('.')}: ${i.message}`),
        });
      }
    });
    data[collection] = valid;
  }

  return { ok: true, data, dropped };
}

const TOMBSTONE_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

/**
 * Merge a server array and a client array of library items keyed on `key`
 * (id or slug). Membership is explicit: a deletion is an item with
 * `deleted:true` and a bumped `rev`, never an omission — so an item present
 * only on the server is always kept (an empty/fresh device cannot wipe the
 * server), and a stale re-add (lower rev) cannot resurrect a tombstone.
 * Conflict order is the per-item integer `rev`; ties keep the server copy.
 *
 * Tradeoff: because the client bumps `rev` on every local edit, two devices
 * that independently edit the same item from the same base both reach the same
 * `rev` with different content — the tie resolves to the server copy, so the
 * other device's edit is dropped (last-writer-undetermined). Acceptable for a
 * single user across their own devices; deletions are never affected.
 *
 * Contract: inputs MUST be validated first (every item has a non-empty `key`);
 * `parseUserDataResilient` guarantees this. Keyless items would collide on
 * `undefined`.
 */
export function mergeCollection(serverItems = [], clientItems = [], key) {
  const map = new Map();
  for (const s of serverItems) map.set(s[key], s);
  for (const c of clientItems) {
    const existing = map.get(c[key]);
    if (!existing) {
      map.set(c[key], c);
    } else if ((c.rev || 0) > (existing.rev || 0)) {
      map.set(c[key], c);
    }
    // tie or lower rev → keep server copy
  }
  return [...map.values()];
}

/** The live (non-deleted) subset, for responses to the client. */
export function liveItems(items = []) {
  return items.filter(i => !i.deleted);
}

/**
 * Drop tombstones older than the TTL; keep all live items. `now` is ms.
 * Fail-safe: a tombstone with a missing or unparseable `deletedAt` is RETAINED,
 * not dropped — dropping it would let a stale offline device resurrect the
 * delete, defeating the whole point of tombstones.
 */
export function prunedTombstones(items = [], now) {
  return items.filter(i => {
    if (!i.deleted) return true;
    const ts = i.deletedAt ? Date.parse(i.deletedAt) : NaN;
    if (Number.isNaN(ts)) return true; // malformed tombstone → keep (fail-safe)
    return now - ts < TOMBSTONE_TTL_MS;
  });
}

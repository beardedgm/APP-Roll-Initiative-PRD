import { z } from 'zod';

const diceHistoryEntrySchema = z.object({
  id: z.string(),
  sides: z.number().int().positive(),
  count: z.number().int().positive(),
  modifier: z.number().int(),
  advantage: z.enum(['normal', 'advantage', 'disadvantage']),
  rolls: z.array(z.number().int()).max(20),
  total: z.number().int(),
});

const combatantSchema = z.object({
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

const latestSharedRollSchema = z.object({
  id: z.string(),
  label: z.string(),
  sides: z.number().int().positive(),
  count: z.number().int().positive(),
  modifier: z.number().int(),
  advantage: z.enum(['normal', 'advantage', 'disadvantage']),
  rolls: z.array(z.number().int()).max(20),
  total: z.number().int(),
  timestamp: z.number(),
}).nullable();

export const createEncounterSchema = z.object({
  name: z.string().min(1).max(100).trim(),
  state: z.enum(['pre-combat', 'combat']).default('pre-combat'),
  currentRound: z.number().int().min(1).default(1),
  activeCreatureId: z.string().nullable().default(null),
  combatants: z.array(combatantSchema).max(100).default([])
    .refine(
      (combatants) => new Set(combatants.map(c => c.id)).size === combatants.length,
      { message: 'Combatant IDs must be unique' }
    ),
  diceHistory: z.array(diceHistoryEntrySchema).max(50).default([]),
  latestSharedRoll: latestSharedRollSchema.optional().default(null),
});

// Query params for the encounter list. z.coerce handles the string-typed
// query values; bounds keep a single request from pulling the whole table.
export const listEncountersQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
  skip: z.coerce.number().int().min(0).default(0),
});

export const updateEncounterSchema = z.object({
  baseRev: z.number().int().min(0),
  name: z.string().min(1).max(100).trim().optional(),
  state: z.enum(['pre-combat', 'combat']).optional(),
  currentRound: z.number().int().min(1).optional(),
  activeCreatureId: z.string().nullable().optional(),
  combatants: z.array(combatantSchema).max(100).optional()
    .refine(
      (combatants) => !combatants || new Set(combatants.map(c => c.id)).size === combatants.length,
      { message: 'Combatant IDs must be unique' }
    ),
  diceHistory: z.array(diceHistoryEntrySchema).max(50).optional(),
  latestSharedRoll: latestSharedRollSchema.optional(),
});

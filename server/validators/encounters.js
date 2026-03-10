import { z } from 'zod';

const combatantSchema = z.object({
  id: z.string(),
  name: z.string().max(100),
  type: z.enum(['player', 'monster', 'npc']).default('monster'),
  initiative: z.number().default(0),
  initiativeModifier: z.number().default(0),
  ac: z.number().min(0).max(99).default(10),
  hp: z.object({
    current: z.number(),
    max: z.number().min(1),
  }),
  status: z.enum(['normal', 'unconscious']).default('normal'),
  monsterSlug: z.string().optional(),
});

export const createEncounterSchema = z.object({
  name: z.string().min(1).max(100).trim(),
  state: z.enum(['pre-combat', 'combat']).default('pre-combat'),
  currentRound: z.number().int().min(1).default(1),
  activeCreatureId: z.string().nullable().default(null),
  combatants: z.array(combatantSchema).max(100).default([]),
  diceHistory: z.array(z.any()).max(50).default([]),
});

export const updateEncounterSchema = z.object({
  name: z.string().min(1).max(100).trim().optional(),
  state: z.enum(['pre-combat', 'combat']).optional(),
  currentRound: z.number().int().min(1).optional(),
  activeCreatureId: z.string().nullable().optional(),
  combatants: z.array(combatantSchema).max(100).optional(),
  diceHistory: z.array(z.any()).max(50).optional(),
});

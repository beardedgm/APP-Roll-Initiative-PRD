import { z } from 'zod';

const characterSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(100),
  type: z.enum(['player', 'npc']).default('player'),
  maxHP: z.number().int().min(1).max(99999).nullable().default(null),
  ac: z.number().int().min(0).max(99).default(10),
  initMod: z.number().int().min(-10).max(20).default(0),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

const entrySchema = z.object({
  name: z.string().max(500),
  description: z.string().max(10000),
});

const customMonsterSchema = z.object({
  slug: z.string().min(1).max(200),
  name: z.string().min(1).max(100),
  isCustom: z.boolean().optional().default(true),
  sourceKey: z.string().max(50).optional().default('custom'),
  source: z.string().max(50).optional().default('Custom'),
  size: z.string().max(50).optional(),
  type: z.string().max(100).optional(),
  alignment: z.string().max(100).optional(),
  ac: z.number().int().min(0).max(30).optional(),
  acDesc: z.string().max(200).optional(),
  hp: z.number().int().min(1).max(99999).optional(),
  hpFormula: z.string().max(50).optional(),
  speed: z.string().max(200).optional(),
  abilities: z.object({
    str: z.number().int().min(1).max(30).optional(),
    dex: z.number().int().min(1).max(30).optional(),
    con: z.number().int().min(1).max(30).optional(),
    int: z.number().int().min(1).max(30).optional(),
    wis: z.number().int().min(1).max(30).optional(),
    cha: z.number().int().min(1).max(30).optional(),
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
  initMod: z.number().int().min(-10).max(20).optional(),
  traits: z.array(entrySchema).max(50).optional().default([]),
  actions: z.array(entrySchema).max(50).optional().default([]),
  reactions: z.array(entrySchema).max(50).optional().default([]),
  legendaryActions: z.array(entrySchema).max(50).optional().default([]),
  rawMarkdown: z.string().max(50000).optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

const encounterPresetSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(100),
  combatants: z.array(z.any()).max(100).default([]),
  state: z.enum(['pre-combat', 'combat']).default('pre-combat'),
  currentRound: z.number().int().min(1).default(1),
  activeCreatureId: z.string().nullable().default(null),
  diceHistory: z.array(z.any()).max(50).default([]),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

export const updateUserDataSchema = z.object({
  version: z.number().int().min(0),
  characters: z.array(characterSchema).max(500).default([]),
  customMonsters: z.array(customMonsterSchema).max(500).default([]),
  encounterPresets: z.array(encounterPresetSchema).max(500).default([]),
});

import { z } from 'zod';

const abilitiesSchema = z.object({
  str: z.number().int().min(1).max(30).optional(),
  dex: z.number().int().min(1).max(30).optional(),
  con: z.number().int().min(1).max(30).optional(),
  int: z.number().int().min(1).max(30).optional(),
  wis: z.number().int().min(1).max(30).optional(),
  cha: z.number().int().min(1).max(30).optional(),
}).optional();

const VALID_CRS = [
  '0', '1/8', '1/4', '1/2',
  ...Array.from({ length: 30 }, (_, i) => String(i + 1)),
];

export const createMonsterSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100).trim(),
  size: z.string().max(50).optional(),
  type: z.string().max(100).optional(),
  alignment: z.string().max(100).optional(),
  cr: z.string().refine(v => !v || VALID_CRS.includes(v), { message: 'Invalid CR value' }).optional(),
  hp: z.number().int().min(1).max(99999).optional(),
  hpFormula: z.string().max(50).optional(),
  ac: z.number().int().min(0).max(30).optional(),
  acDesc: z.string().max(200).optional(),
  initMod: z.number().int().min(-10).max(20).optional(),
  abilities: abilitiesSchema,
  rawMarkdown: z.string().max(50000).optional(),
});

export const updateMonsterSchema = createMonsterSchema.partial();

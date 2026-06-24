import { z } from 'zod';

export const seedMonsterSchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1),
  source: z.string().min(1),
  sourceKey: z.string().min(1),
  gameSystem: z.enum(['5e', 'pf2e']),
  ac: z.number().int().min(1).max(60),
  hp: z.number().int().min(1),
  cr: z.string().min(1),
  crNumeric: z.number(),            // may be negative (PF2e level -1)
}).passthrough();

export const seedSpellSchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1),
  source: z.string().min(1),
  sourceKey: z.string().min(1),
  gameSystem: z.enum(['5e', 'pf2e']),
  level: z.number().int().min(0).max(10),
}).passthrough().superRefine((val, ctx) => {
  if (val.gameSystem === '5e' && !val.school) {
    ctx.addIssue({ code: 'custom', path: ['school'], message: '5e spell requires a school' });
  }
});

/** Split parsed records into valid/invalid, reporting the source file. */
export function validateSeedRecords(records, schema) {
  const valid = [];
  const invalid = [];
  for (const r of records) {
    const result = schema.safeParse(r.doc);
    if (result.success) valid.push({ ...r, doc: result.data });
    else invalid.push({
      file: r.file,
      slug: r.doc?.slug,
      name: r.doc?.name,
      issues: result.error.issues.map(i => `${i.path.join('.')}: ${i.message}`),
    });
  }
  return { valid, invalid };
}

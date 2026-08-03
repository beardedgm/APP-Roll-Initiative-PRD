import { describe, it, expect } from 'vitest';
import { seedMonsterSchema, validateSeedRecords } from '../../validators/seedContent.js';

const good = { name: 'Goblin', slug: '5.1_srd--goblin', source: '5.1 SRD', sourceKey: '5.1_srd', gameSystem: '5e', ac: 15, hp: 7, cr: '1/4', crNumeric: 0.25, initMod: 2 };

describe('seedMonsterSchema', () => {
  it('accepts a complete record', () => {
    expect(seedMonsterSchema.safeParse(good).success).toBe(true);
  });
  it('rejects a record whose AC failed to parse (no silent default)', () => {
    const { ac: _ac, ...noAc } = good;
    expect(seedMonsterSchema.safeParse(noAc).success).toBe(false);
  });

  // l7: initMod must be validated like ac/hp — an unparseable initiative or
  // Perception must skip-and-report the record, never silently seed +0.
  it('rejects a record whose initMod failed to parse', () => {
    const { initMod: _i, ...noInit } = good;
    expect(seedMonsterSchema.safeParse(noInit).success).toBe(false);
  });
  it('accepts negative initMod (DEX 0 → −5, PF2e low-level creatures)', () => {
    expect(seedMonsterSchema.safeParse({ ...good, initMod: -5 }).success).toBe(true);
  });
  it('accepts high PF2e Perception-derived initMod', () => {
    expect(seedMonsterSchema.safeParse({ ...good, initMod: 36 }).success).toBe(true);
  });
});

describe('validateSeedRecords', () => {
  it('separates valid from invalid and reports the file', () => {
    const recs = [
      { file: 'goblin.md', doc: good },
      { file: 'broken.md', doc: { ...good, hp: undefined } },
    ];
    const { valid, invalid } = validateSeedRecords(recs, seedMonsterSchema);
    expect(valid).toHaveLength(1);
    expect(invalid[0].file).toBe('broken.md');
  });
});

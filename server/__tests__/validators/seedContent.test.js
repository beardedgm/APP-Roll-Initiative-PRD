import { describe, it, expect } from 'vitest';
import { seedMonsterSchema, validateSeedRecords } from '../../validators/seedContent.js';

const good = { name: 'Goblin', slug: '5.1_srd--goblin', source: '5.1 SRD', sourceKey: '5.1_srd', gameSystem: '5e', ac: 15, hp: 7, cr: '1/4', crNumeric: 0.25 };

describe('seedMonsterSchema', () => {
  it('accepts a complete record', () => {
    expect(seedMonsterSchema.safeParse(good).success).toBe(true);
  });
  it('rejects a record whose AC failed to parse (no silent default)', () => {
    const { ac: _ac, ...noAc } = good;
    expect(seedMonsterSchema.safeParse(noAc).success).toBe(false);
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

import { describe, it, expect } from 'vitest';
import { createEncounterSchema, updateEncounterSchema } from '../../validators/encounters.js';

// M8: .min(1).max(100).trim() validated the untrimmed name, so "   " passed
// min(1) and stored as "" — an encounter with an empty name. Trim runs first.
describe('encounter name trim ordering (M8)', () => {
  it('rejects a whitespace-only name on create', () => {
    expect(createEncounterSchema.safeParse({ name: '   ' }).success).toBe(false);
  });

  it('rejects a whitespace-only name on update', () => {
    expect(updateEncounterSchema.safeParse({ baseRev: 0, name: '  \t' }).success).toBe(false);
  });

  it('trims a padded name on create', () => {
    const result = createEncounterSchema.safeParse({ name: '  Goblin Ambush  ' });
    expect(result.success).toBe(true);
    expect(result.data.name).toBe('Goblin Ambush');
  });
});

import { describe, it, expect } from 'vitest';
import { parseUserDataResilient } from '../../validators/userData.js';

function body(characters) {
  return { version: 0, characters, customMonsters: [], encounterPresets: [] };
}

// f7: characterSchema.initMod was capped at 20 while the custom-monster schema
// was widened to 50 for PF2e. A level-20 PF2e character (Perception ~+25) was
// silently dropped on sync. The character bound must accept the same range.
describe('characterSchema bounds (via parseUserDataResilient)', () => {
  it('keeps a PF2e-range initMod of 25 instead of dropping the character', () => {
    const r = parseUserDataResilient(body([{ id: 'c1', name: 'Aria', initMod: 25 }]));
    expect(r.ok).toBe(true);
    expect(r.dropped).toHaveLength(0);
    expect(r.data.characters).toHaveLength(1);
    expect(r.data.characters[0].initMod).toBe(25);
  });

  it('still reports a genuinely invalid character (negative maxHP) as dropped', () => {
    const r = parseUserDataResilient(body([{ id: 'c2', name: 'Typo', maxHP: -5 }]));
    expect(r.ok).toBe(true);
    expect(r.data.characters).toHaveLength(0);
    expect(r.dropped).toHaveLength(1);
    expect(r.dropped[0].collection).toBe('characters');
    expect(r.dropped[0].name).toBe('Typo');
  });
});

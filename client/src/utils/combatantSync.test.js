import { describe, it, expect } from 'vitest';
import { sanitizeCombatantForSync, sanitizeCombatantsForSync } from './combatantSync';

// f16 root of the encounters 400: a combatant whose initiative is NaN (from a
// mid-combat add + drag-reorder) serializes to `null`, which the server's
// z.number() rejects — 400, and the encounter never syncs. Sanitize non-finite
// numeric fields to a valid default before the PUT.
describe('sanitizeCombatantForSync', () => {
  it('coerces a NaN initiative to 0', () => {
    expect(sanitizeCombatantForSync({ id: 'a', initiative: NaN }).initiative).toBe(0);
  });

  it('coerces undefined/null initiative and initiativeModifier to 0', () => {
    const out = sanitizeCombatantForSync({ id: 'a', initiative: undefined, initiativeModifier: null });
    expect(out.initiative).toBe(0);
    expect(out.initiativeModifier).toBe(0);
  });

  it('leaves valid finite values untouched', () => {
    const c = { id: 'a', name: 'Aria', initiative: 17, initiativeModifier: 3, ac: 15 };
    expect(sanitizeCombatantForSync(c)).toEqual(c);
  });

  it('maps a whole list', () => {
    const out = sanitizeCombatantsForSync([
      { id: 'a', initiative: NaN },
      { id: 'b', initiative: 12 },
    ]);
    expect(out.map((c) => c.initiative)).toEqual([0, 12]);
  });
});

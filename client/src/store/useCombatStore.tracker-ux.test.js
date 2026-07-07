import { describe, it, expect, beforeEach } from 'vitest';
import useCombatStore from './useCombatStore';

const get = () => useCombatStore.getState();
const byName = (n) => get().combatants.find((c) => c.name === n);

beforeEach(() => get().clearAll());

function addMonster(name, extra = {}) {
  get().addCombatant({ name, maxHP: 10, ac: 12, initMod: 0, quantity: 1, type: 'monster', ...extra });
}

// f16: a monster added mid-combat got initiative: undefined, which drag-reorder
// then turned into NaN → null on sync → server 400.
describe('addCombatant — initiative is always finite (f16)', () => {
  it('defaults initiative to 0 when added mid-combat without one', () => {
    useCombatStore.setState({ state: 'combat' });
    addMonster('Goblin'); // no initiative passed
    expect(Number.isFinite(byName('Goblin').initiative)).toBe(true);
    expect(byName('Goblin').initiative).toBe(0);
  });
});

describe('reorderCombatant — never produces NaN (f16)', () => {
  it('gives the dragged combatant a finite initiative even next to a non-finite neighbor', () => {
    useCombatStore.setState({ state: 'combat' });
    addMonster('A', { initiative: 20 });
    addMonster('B', { initiative: 10 });
    addMonster('C', { initiative: 5 });
    // Simulate the bug precondition: a neighbor with a broken initiative.
    useCombatStore.setState((s) => ({
      combatants: s.combatants.map((c) => (c.name === 'B' ? { ...c, initiative: undefined } : c)),
    }));

    get().reorderCombatant(byName('C').id, byName('B').id); // drop C next to B

    // The slot math must not have produced NaN for the dragged combatant.
    expect(Number.isFinite(byName('C').initiative)).toBe(true);
  });
});

// l7: reset reuses the same cloud encounter, so the share link stays live — but
// resetEncounter dropped the local shareCode, leaving the UI unable to show or
// revoke the still-active link.
describe('resetEncounter — preserves the share code (l7)', () => {
  it('keeps shareCode and cloud identifiers across a reset', () => {
    get().setCloudId('cloud1');
    get().setCloudRev(3);
    get().setShareCode('abcd1234');

    get().resetEncounter();

    expect(get().shareCode).toBe('abcd1234');
    expect(get().cloudId).toBe('cloud1');
    expect(get().cloudRev).toBe(3);
  });
});

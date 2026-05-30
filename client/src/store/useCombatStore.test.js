import { describe, it, expect, beforeEach } from 'vitest';
import useCombatStore from './useCombatStore';

// Helpers ---------------------------------------------------------
const get = () => useCombatStore.getState();
const names = () => get().combatants.map(c => c.name);
const byName = (name) => get().combatants.find(c => c.name === name);

function addMonster(name, quantity = 1, extra = {}) {
  get().addCombatant({ name, maxHP: 10, ac: 12, initMod: 0, quantity, type: 'monster', ...extra });
}

// Reset the singleton store before each test.
beforeEach(() => {
  get().clearAll();
});

describe('addCombatant — auto-numbering', () => {
  it('leaves a single combatant unnumbered', () => {
    addMonster('Goblin');
    expect(names()).toEqual(['Goblin']);
  });

  it('numbers a batch added via quantity', () => {
    addMonster('Goblin', 3);
    expect(names()).toEqual(['Goblin 1', 'Goblin 2', 'Goblin 3']);
  });

  it('renames the first unnumbered match when a second is added', () => {
    addMonster('Goblin');
    addMonster('Goblin');
    expect(names()).toEqual(['Goblin 1', 'Goblin 2']);
  });

  it('continues numbering past an existing numbered batch', () => {
    addMonster('Goblin', 2);
    addMonster('Goblin');
    expect(names()).toEqual(['Goblin 1', 'Goblin 2', 'Goblin 3']);
  });

  it('does not collide names that merely share a prefix', () => {
    addMonster('Goblin');
    addMonster('Goblin Boss');
    expect(names()).toEqual(['Goblin', 'Goblin Boss']);
  });

  it('clamps quantity to a max of 10', () => {
    addMonster('Rat', 50);
    expect(get().combatants).toHaveLength(10);
  });

  it('clamps a zero/falsy quantity up to 1', () => {
    addMonster('Rat', 0);
    expect(get().combatants).toHaveLength(1);
  });
});

describe('startCombat', () => {
  it('sorts by initiative descending and activates the leader', () => {
    addMonster('A');
    addMonster('B');
    addMonster('C');
    const [a, b, c] = get().combatants;
    get().startCombat({ [a.id]: 5, [b.id]: 20, [c.id]: 12 });

    expect(get().state).toBe('combat');
    expect(names()).toEqual(['B', 'C', 'A']);
    expect(get().activeCreatureId).toBe(b.id);
    expect(get().currentRound).toBe(1);
  });
});

describe('reorderCombatant — integer midpoint', () => {
  function setupCombat() {
    addMonster('A');
    addMonster('B');
    addMonster('C');
    const [a, b, c] = get().combatants;
    get().startCombat({ [a.id]: 20, [b.id]: 10, [c.id]: 5 }); // order A,B,C
    return { a, b, c };
  }

  it('assigns next+1 when dragged to the top', () => {
    const { a, c } = setupCombat();
    get().reorderCombatant(c.id, a.id); // move C above A
    expect(names()[0]).toBe('C');
    expect(byName('C').initiative).toBe(21); // top neighbor (A=20) + 1
  });

  it('assigns prev-1 when dragged to the bottom', () => {
    const { a, c } = setupCombat();
    get().reorderCombatant(a.id, c.id); // move A below... lands before C
    // After splice A sits between B(10) and C(5): floor((10+5)/2) = 7
    expect(byName('A').initiative).toBe(7);
  });

  it('only ever produces integer initiatives', () => {
    const { a, c } = setupCombat();
    get().reorderCombatant(a.id, c.id);
    for (const combatant of get().combatants) {
      expect(Number.isInteger(combatant.initiative)).toBe(true);
    }
  });
});

describe('setCombatantInitiative', () => {
  it('updates the value and re-sorts descending', () => {
    addMonster('A');
    addMonster('B');
    const [a, b] = get().combatants;
    get().startCombat({ [a.id]: 20, [b.id]: 10 });
    get().setCombatantInitiative(b.id, 99);
    expect(names()).toEqual(['B', 'A']);
  });
});

describe('turn navigation', () => {
  function threeInCombat() {
    addMonster('A');
    addMonster('B');
    addMonster('C');
    const [a, b, c] = get().combatants;
    get().startCombat({ [a.id]: 30, [b.id]: 20, [c.id]: 10 }); // A,B,C
    return { a, b, c };
  }

  it('advances through the order then wraps to the next round', () => {
    const { a, b, c } = threeInCombat();
    expect(get().activeCreatureId).toBe(a.id);
    get().nextTurn();
    expect(get().activeCreatureId).toBe(b.id);
    get().nextTurn();
    expect(get().activeCreatureId).toBe(c.id);
    get().nextTurn();
    expect(get().activeCreatureId).toBe(a.id);
    expect(get().currentRound).toBe(2);
  });

  it('prevTurn steps back and decrements the round at the boundary', () => {
    const { c } = threeInCombat();
    get().nextTurn(); // round 1 -> B
    get().nextTurn(); // -> C
    get().nextTurn(); // round 2 -> A
    expect(get().currentRound).toBe(2);
    get().prevTurn(); // back to C, round 1
    expect(get().activeCreatureId).toBe(c.id);
    expect(get().currentRound).toBe(1);
  });

  it('canGoPrev is false at the very first turn of round 1', () => {
    const { a } = threeInCombat();
    expect(get().activeCreatureId).toBe(a.id);
    expect(get().canGoPrev()).toBe(false);
  });
});

describe('applyDamageHeal', () => {
  it('clamps damage at 0 and marks unconscious', () => {
    addMonster('A', 1, { maxHP: 10 });
    const id = get().combatants[0].id;
    const ok = get().applyDamageHeal(id, 'damage', 999);
    expect(ok).toBe(true);
    expect(byName('A').hp.current).toBe(0);
    expect(byName('A').status).toBe('unconscious');
  });

  it('clamps healing at max', () => {
    addMonster('A', 1, { maxHP: 10 });
    const id = get().combatants[0].id;
    get().applyDamageHeal(id, 'damage', 5); // 10 -> 5
    get().applyDamageHeal(id, 'heal', 99); // -> clamps to 10
    expect(byName('A').hp.current).toBe(10);
    expect(byName('A').status).toBe('normal');
  });

  it('rejects non-positive amounts', () => {
    addMonster('A', 1, { maxHP: 10 });
    const id = get().combatants[0].id;
    expect(get().applyDamageHeal(id, 'damage', 0)).toBe(false);
    expect(get().applyDamageHeal(id, 'damage', NaN)).toBe(false);
    expect(byName('A').hp.current).toBe(10);
  });
});

describe('undo / redo', () => {
  it('undo reverts an add and redo reapplies it', () => {
    addMonster('Goblin');
    expect(get().combatants).toHaveLength(1);
    get().undo();
    expect(get().combatants).toHaveLength(0);
    get().redo();
    expect(names()).toEqual(['Goblin']);
  });

  it('a new action clears the redo stack', () => {
    addMonster('A');
    get().undo();
    addMonster('B');
    get().redo(); // nothing to redo — A should not come back
    expect(names()).toEqual(['B']);
  });
});

describe('resetEncounter', () => {
  it('keeps players (reset to init 0) and drops monsters', () => {
    get().addCombatant({ name: 'Hero', maxHP: 20, ac: 15, initMod: 2, quantity: 1, type: 'player' });
    addMonster('Goblin');
    const heroId = byName('Hero').id;
    get().startCombat({ [heroId]: 18, [byName('Goblin').id]: 5 });

    get().resetEncounter();
    expect(names()).toEqual(['Hero']);
    expect(byName('Hero').initiative).toBe(0);
    expect(get().state).toBe('pre-combat');
  });
});

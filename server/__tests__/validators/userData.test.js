import { describe, it, expect } from 'vitest';
import { updateUserDataSchema } from '../../validators/userData.js';

// A custom monster as the client store/serializers produce it. The userData PUT
// validates the WHOLE body atomically, so a single rejected monster 400s the
// entire sync — silently blocking ALL custom data from reaching the cloud.
// These tests lock in that both 5e (ability SCORES) and PF2e (ability
// MODIFIERS, often 0/negative, with high AC/Perception) custom monsters pass.
function monster(overrides = {}) {
  return {
    slug: 'custom-test-abc123',
    name: 'Test Creature',
    isCustom: true,
    sourceKey: 'custom',
    source: 'Custom',
    gameSystem: '5e',
    ...overrides,
  };
}

function body(customMonsters) {
  return { version: 0, characters: [], customMonsters, encounterPresets: [] };
}

describe('updateUserDataSchema — custom monster cloud sync', () => {
  it('accepts a default 5e custom monster (ability scores)', () => {
    const m = monster({ ac: 10, initMod: 0, abilities: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 } });
    expect(updateUserDataSchema.safeParse(body([m])).success).toBe(true);
  });

  it('accepts a default PF2e custom monster (ability modifiers default to 0)', () => {
    const m = monster({
      gameSystem: 'pf2e', ac: 15, initMod: 0,
      abilities: { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 },
    });
    expect(updateUserDataSchema.safeParse(body([m])).success).toBe(true);
  });

  it('accepts a PF2e creature with negative ability modifiers', () => {
    const m = monster({
      gameSystem: 'pf2e', ac: 16, initMod: 4,
      abilities: { str: 3, dex: 1, con: 2, int: -3, wis: 0, cha: -2 },
    });
    expect(updateUserDataSchema.safeParse(body([m])).success).toBe(true);
  });

  it('accepts a high-level creature (AC > 30, high Perception/initMod)', () => {
    const m = monster({
      gameSystem: 'pf2e', ac: 54, initMod: 45,
      abilities: { str: 9, dex: 5, con: 8, int: 2, wis: 6, cha: 7 },
    });
    expect(updateUserDataSchema.safeParse(body([m])).success).toBe(true);
  });

  it('still rejects out-of-range garbage (AC 200, ability 99)', () => {
    const m = monster({ ac: 200, abilities: { str: 99, dex: 10, con: 10, int: 10, wis: 10, cha: 10 } });
    expect(updateUserDataSchema.safeParse(body([m])).success).toBe(false);
  });

  it('one invalid monster rejects the entire payload (sync blast radius)', () => {
    const good = monster({ slug: 'custom-good-1', name: 'Good', ac: 12 });
    const bad = monster({ slug: 'custom-bad-1', name: 'Bad', ac: 999 });
    expect(updateUserDataSchema.safeParse(body([good, bad])).success).toBe(false);
  });
});

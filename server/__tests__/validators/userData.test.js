import { describe, it, expect } from 'vitest';
import { updateUserDataSchema, parseUserDataResilient } from '../../validators/userData.js';

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

describe('parseUserDataResilient — per-item validation', () => {
  it('keeps valid items and drops only the invalid one', () => {
    const good = monster({ slug: 'custom-good-1', name: 'Good', ac: 12 });
    const bad = monster({ slug: 'custom-bad-1', name: 'Bad', ac: 999 });
    const result = parseUserDataResilient(body([good, bad]));

    expect(result.ok).toBe(true);
    expect(result.data.customMonsters).toHaveLength(1);
    expect(result.data.customMonsters[0].name).toBe('Good');
    expect(result.dropped).toHaveLength(1);
    expect(result.dropped[0]).toMatchObject({ collection: 'customMonsters', index: 1, name: 'Bad' });
    expect(result.dropped[0].issues.join(' ')).toContain('ac');
  });

  it('reports nothing dropped when everything is valid', () => {
    const m = monster({ ac: 14, abilities: { str: 12, dex: 14, con: 12, int: 10, wis: 10, cha: 8 } });
    const result = parseUserDataResilient(body([m]));
    expect(result.ok).toBe(true);
    expect(result.dropped).toHaveLength(0);
    expect(result.data.customMonsters).toHaveLength(1);
  });

  it('drops invalid items independently across collections', () => {
    const result = parseUserDataResilient({
      version: 0,
      characters: [{ id: 'c1', name: 'Hero', ac: 18 }, { id: 'bad', name: 'NoAC', ac: 999 }],
      customMonsters: [monster({ ac: 14 })],
      encounterPresets: [],
    });
    expect(result.ok).toBe(true);
    expect(result.data.characters).toHaveLength(1);
    expect(result.data.characters[0].name).toBe('Hero');
    expect(result.data.customMonsters).toHaveLength(1);
    expect(result.dropped).toHaveLength(1);
    expect(result.dropped[0]).toMatchObject({ collection: 'characters', name: 'NoAC' });
  });

  it('rejects the request at the envelope level (missing version)', () => {
    const result = parseUserDataResilient({ characters: [], customMonsters: [], encounterPresets: [] });
    expect(result.ok).toBe(false);
  });

  it('rejects the request when a collection exceeds the flood cap', () => {
    const tooMany = Array.from({ length: 501 }, (_, i) => monster({ slug: `custom-${i}`, name: `M${i}` }));
    const result = parseUserDataResilient(body(tooMany));
    expect(result.ok).toBe(false);
  });
});

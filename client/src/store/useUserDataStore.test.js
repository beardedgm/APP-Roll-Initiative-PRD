import { describe, it, expect, beforeEach } from 'vitest';
import useUserDataStore from './useUserDataStore';

const get = () => useUserDataStore.getState();

beforeEach(() => {
  get().resetAll();
});

// resetAll is the store half of account isolation on logout (finding f2): a new
// user on a shared browser must not inherit the previous user's library, and
// _loaded must reset so their own server data actually loads.
describe('resetAll', () => {
  it('clears characters, custom monsters, and encounter presets', () => {
    get().addCharacter({ name: 'Aria', type: 'player' });
    get().addCustomMonster({ name: 'Gribble' });
    get().addEncounterPreset({ name: 'Ambush' });

    get().resetAll();

    expect(get().characters).toEqual([]);
    expect(get().customMonsters).toEqual([]);
    expect(get().encounterPresets).toEqual([]);
  });

  it('clears pending deletion tombstones', () => {
    get().addCharacter({ id: 'c1', name: 'Aria', type: 'player' });
    get().removeCharacter('c1');
    expect(get().deletedCharacters.length).toBe(1);

    get().resetAll();

    expect(get().deletedCharacters).toEqual([]);
    expect(get().deletedCustomMonsters).toEqual([]);
    expect(get().deletedEncounterPresets).toEqual([]);
  });

  it('resets _loaded so the next user re-loads from their own server data', () => {
    get().loadFromServer({ characters: [{ id: 'x', name: 'NotYours' }], version: 4 });
    expect(get()._loaded).toBe(true);

    get().resetAll();

    expect(get()._loaded).toBe(false);
    expect(get().characters).toEqual([]);
    expect(get().version).toBe(0);
  });
});

// M3 (client half): the 500-item product cap is enforced at creation time so
// the sync payload can never outgrow the server's envelope flood cap.
describe('live item cap', () => {
  it('rejects adds past the cap with a user-facing message', () => {
    const chars = Array.from({ length: 500 }, (_, i) => ({ id: `c${i}`, name: `C${i}`, type: 'player' }));
    useUserDataStore.setState({ characters: chars.map(c => ({ ...c, rev: 1, deleted: false })) });
    expect(() => get().addCharacter({ name: 'One Too Many', type: 'player' }))
      .toThrow(/Limit of 500/);
    expect(get().characters).toHaveLength(500);
  });

  it('allows the overwrite path at the cap (replaces, does not grow)', () => {
    const monsters = Array.from({ length: 500 }, (_, i) => ({ slug: `m${i}`, name: `M${i}`, rev: 1, deleted: false }));
    useUserDataStore.setState({ customMonsters: monsters });
    expect(() => get().addCustomMonster({ name: 'Updated M0' }, 'm0')).not.toThrow();
    expect(get().customMonsters).toHaveLength(500);
    expect(() => get().addCustomMonster({ name: 'Net New' })).toThrow(/Limit of 500/);
  });

  it('caps encounter presets too', () => {
    const presets = Array.from({ length: 500 }, (_, i) => ({ id: `e${i}`, name: `E${i}`, rev: 1, deleted: false }));
    useUserDataStore.setState({ encounterPresets: presets });
    expect(() => get().addEncounterPreset({ name: 'Overflow' })).toThrow(/Limit of 500/);
  });
});

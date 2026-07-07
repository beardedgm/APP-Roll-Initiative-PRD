import { describe, it, expect } from 'vitest';
import { buildUserDataPayload } from './userDataPayload';

describe('buildUserDataPayload', () => {
  it('combines live items and pending tombstones per collection', () => {
    const state = {
      version: 4,
      characters: [{ id: 'a' }],
      customMonsters: [{ slug: 'm1' }],
      encounterPresets: [{ id: 'e1' }],
      deletedCharacters: [{ id: 'a2', deleted: true }],
      deletedCustomMonsters: [{ slug: 'm2', deleted: true }],
      deletedEncounterPresets: [{ id: 'e2', deleted: true }],
    };
    expect(buildUserDataPayload(state)).toEqual({
      version: 4,
      characters: [{ id: 'a' }, { id: 'a2', deleted: true }],
      customMonsters: [{ slug: 'm1' }, { slug: 'm2', deleted: true }],
      encounterPresets: [{ id: 'e1' }, { id: 'e2', deleted: true }],
    });
  });
});

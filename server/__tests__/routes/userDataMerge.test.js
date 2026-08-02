import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import mongoose from 'mongoose';
import { mergeUserData } from '../../routes/userData.js';
import { startMemoryDb, clearMemoryDb, stopMemoryDb } from '../helpers/memoryDb.js';

beforeAll(startMemoryDb);
afterEach(clearMemoryDb);
afterAll(stopMemoryDb);

describe('mergeUserData', () => {
  it('a delete on one device does not resurrect after a later stale sync', async () => {
    const userId = new mongoose.Types.ObjectId();
    await mergeUserData(userId, {
      version: 0,
      characters: [], encounterPresets: [],
      customMonsters: [{ slug: 'goblin-king', name: 'Goblin King', rev: 1 }],
    });
    const afterDelete = await mergeUserData(userId, {
      version: 1,
      characters: [], encounterPresets: [],
      customMonsters: [{ slug: 'goblin-king', name: 'Goblin King', rev: 2, deleted: true, deletedAt: new Date().toISOString() }],
    });
    expect(afterDelete.customMonsters).toHaveLength(0);
    const afterStale = await mergeUserData(userId, {
      version: 0,
      characters: [], encounterPresets: [],
      customMonsters: [{ slug: 'goblin-king', name: 'Goblin King', rev: 1 }],
    });
    expect(afterStale.customMonsters).toHaveLength(0); // STILL deleted — no resurrection
  });

  it('an empty/fresh device cannot wipe existing server data', async () => {
    const userId = new mongoose.Types.ObjectId();
    await mergeUserData(userId, {
      version: 0, characters: [{ id: 'c1', name: 'Aragorn', rev: 1 }],
      customMonsters: [], encounterPresets: [],
    });
    const out = await mergeUserData(userId, { version: 0, characters: [], customMonsters: [], encounterPresets: [] });
    expect(out.characters).toHaveLength(1);
  });
});

// M7: the first-ever sync for a user must not crash when racing another
// request — find-then-create both saw null and the loser threw E11000 on the
// unique userId index, 500ing a request that should have succeeded.
describe('mergeUserData first-sync race', () => {
  it('two concurrent first syncs create exactly one doc and neither throws', async () => {
    const userId = new mongoose.Types.ObjectId();
    const empty = { version: 0, characters: [], customMonsters: [], encounterPresets: [] };
    const [a, b] = await Promise.all([
      mergeUserData(userId, { ...empty, characters: [{ id: 'c1', name: 'Aria', rev: 1 }] }),
      mergeUserData(userId, { ...empty, characters: [{ id: 'c2', name: 'Borin', rev: 1 }] }),
    ]);
    expect(a).toBeTruthy();
    expect(b).toBeTruthy();
    const UserData = (await import('../../models/UserData.js')).default;
    expect(await UserData.countDocuments({ userId })).toBe(1);
  });
});

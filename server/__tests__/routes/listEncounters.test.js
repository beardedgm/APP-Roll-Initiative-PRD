import { describe, it, expect, beforeAll, afterEach, afterAll } from 'vitest';
import mongoose from 'mongoose';
import { listEncountersQuerySchema } from '../../validators/encounters.js';
import { listEncounters } from '../../routes/encounters.js';
import { startMemoryDb, clearMemoryDb, stopMemoryDb } from '../helpers/memoryDb.js';
import Encounter from '../../models/Encounter.js';

// M10: the list was hard-capped at limit(50) with no pagination params and no
// total — encounters 51+ were invisible and unreachable through the API.
describe('listEncountersQuerySchema', () => {
  it('defaults limit 50 / skip 0', () => {
    expect(listEncountersQuerySchema.parse({})).toEqual({ limit: 50, skip: 0 });
  });

  it('coerces string query values', () => {
    expect(listEncountersQuerySchema.parse({ limit: '10', skip: '20' })).toEqual({ limit: 10, skip: 20 });
  });

  it('rejects out-of-bounds values', () => {
    expect(listEncountersQuerySchema.safeParse({ limit: '101' }).success).toBe(false);
    expect(listEncountersQuerySchema.safeParse({ limit: '0' }).success).toBe(false);
    expect(listEncountersQuerySchema.safeParse({ skip: '-1' }).success).toBe(false);
  });
});

describe('listEncounters', () => {
  beforeAll(startMemoryDb);
  afterEach(clearMemoryDb);
  afterAll(stopMemoryDb);

  function combatant(id) {
    return { id, name: `C${id}`, type: 'monster', initiative: 0, ac: 10, hp: { current: 5, max: 5 } };
  }

  it('scopes to the user, projects combatantCount, and reports total', async () => {
    const userA = new mongoose.Types.ObjectId();
    const userB = new mongoose.Types.ObjectId();
    await Encounter.create([
      { userId: userA, name: 'A1', combatants: [combatant('1'), combatant('2')] },
      { userId: userA, name: 'A2', combatants: [] },
      { userId: userB, name: 'B1', combatants: [combatant('3')] },
    ]);

    const { encounters, total } = await listEncounters(userA, { limit: 50, skip: 0 });
    expect(total).toBe(2);
    expect(encounters.map(e => e.name).sort()).toEqual(['A1', 'A2']);
    const a1 = encounters.find(e => e.name === 'A1');
    expect(a1.combatantCount).toBe(2);
    // Full combatant arrays must NOT be materialized in the list projection.
    expect(a1.combatants).toBeUndefined();
    expect(a1.shareCode).toBeNull();
  });

  it('paginates by recency and total counts everything', async () => {
    const userId = new mongoose.Types.ObjectId();
    for (let i = 0; i < 5; i++) {
      const doc = await Encounter.create({ userId, name: `E${i}` });
      // Stagger updatedAt so the recency sort is deterministic.
      await Encounter.updateOne({ _id: doc._id }, { $set: { updatedAt: new Date(2026, 0, i + 1) } }, { timestamps: false });
    }

    const page1 = await listEncounters(userId, { limit: 2, skip: 0 });
    const page2 = await listEncounters(userId, { limit: 2, skip: 2 });
    expect(page1.total).toBe(5);
    expect(page1.encounters.map(e => e.name)).toEqual(['E4', 'E3']);
    expect(page2.encounters.map(e => e.name)).toEqual(['E2', 'E1']);
  });

  it('accepts a string userId (session values are strings, aggregate does not auto-cast)', async () => {
    const userId = new mongoose.Types.ObjectId();
    await Encounter.create({ userId, name: 'Stringy' });
    const { encounters, total } = await listEncounters(String(userId), { limit: 50, skip: 0 });
    expect(total).toBe(1);
    expect(encounters[0].name).toBe('Stringy');
  });
});

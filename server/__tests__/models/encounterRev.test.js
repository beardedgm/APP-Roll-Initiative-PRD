import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import mongoose from 'mongoose';
import Encounter from '../../models/Encounter.js';
import { startMemoryDb, clearMemoryDb, stopMemoryDb } from '../helpers/memoryDb.js';

beforeAll(startMemoryDb);
afterEach(clearMemoryDb);
afterAll(stopMemoryDb);

function casUpdate(id, userId, baseRev, updates) {
  return Encounter.findOneAndUpdate(
    { _id: id, userId, rev: baseRev },
    { $set: { ...updates, lastSyncedAt: new Date() }, $inc: { rev: 1 } },
    { returnDocument: 'after' }
  );
}

describe('Encounter optimistic concurrency', () => {
  it('starts new encounters at rev 0', async () => {
    const userId = new mongoose.Types.ObjectId();
    const enc = await Encounter.create({ userId, name: 'A' });
    expect(enc.rev).toBe(0);
  });

  it('accepts a matching baseRev and increments rev', async () => {
    const userId = new mongoose.Types.ObjectId();
    const enc = await Encounter.create({ userId, name: 'A' });
    const updated = await casUpdate(enc._id, userId, 0, { name: 'B' });
    expect(updated).not.toBeNull();
    expect(updated.rev).toBe(1);
    expect(updated.name).toBe('B');
  });

  it('rejects a stale baseRev (second writer at the same base loses)', async () => {
    const userId = new mongoose.Types.ObjectId();
    const enc = await Encounter.create({ userId, name: 'A' });
    const first = await casUpdate(enc._id, userId, 0, { name: 'first' });
    expect(first.rev).toBe(1);
    const second = await casUpdate(enc._id, userId, 0, { name: 'second' });
    expect(second).toBeNull();
    const fresh = await Encounter.findById(enc._id);
    expect(fresh.name).toBe('first');
  });

  it('accepts baseRev 0 for a legacy doc that has no rev field', async () => {
    const userId = new mongoose.Types.ObjectId();
    const enc = await Encounter.create({ userId, name: 'legacy' });
    // Simulate a pre-`rev` document: strip the field directly in the collection.
    await mongoose.connection.collection('encounters').updateOne(
      { _id: enc._id },
      { $unset: { rev: '' } }
    );
    // Route's legacy-tolerant filter for baseRev 0.
    const updated = await Encounter.findOneAndUpdate(
      { _id: enc._id, userId, $or: [{ rev: 0 }, { rev: { $exists: false } }] },
      { $set: { name: 'migrated' }, $inc: { rev: 1 } },
      { returnDocument: 'after' }
    );
    expect(updated).not.toBeNull();
    expect(updated.rev).toBe(1);
    expect(updated.name).toBe('migrated');
  });
});

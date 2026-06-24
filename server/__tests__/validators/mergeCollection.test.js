import { describe, it, expect } from 'vitest';
import { mergeCollection, liveItems, prunedTombstones } from '../../validators/userData.js';

const day = 24 * 60 * 60 * 1000;

describe('mergeCollection (id-keyed)', () => {
  it('keeps a server item the client never sent (fresh/empty device cannot wipe)', () => {
    const server = [{ id: 'a', name: 'A', rev: 1 }];
    expect(mergeCollection(server, [], 'id')).toEqual(server);
  });

  it('takes a client-only item', () => {
    const out = mergeCollection([], [{ id: 'b', name: 'B', rev: 0 }], 'id');
    expect(out).toEqual([{ id: 'b', name: 'B', rev: 0 }]);
  });

  it('higher rev wins when both sides have the item', () => {
    const server = [{ id: 'a', name: 'old', rev: 1 }];
    const client = [{ id: 'a', name: 'new', rev: 2 }];
    expect(mergeCollection(server, client, 'id')[0].name).toBe('new');
  });

  it('keeps the server copy on a rev tie', () => {
    const server = [{ id: 'a', name: 'server', rev: 2 }];
    const client = [{ id: 'a', name: 'client', rev: 2 }];
    expect(mergeCollection(server, client, 'id')[0].name).toBe('server');
  });

  it('a deletion (tombstone with higher rev) wins and stays deleted', () => {
    const server = [{ id: 'a', name: 'A', rev: 1 }];
    const client = [{ id: 'a', name: 'A', rev: 2, deleted: true, deletedAt: '2026-06-24T00:00:00.000Z' }];
    const merged = mergeCollection(server, client, 'id');
    expect(merged[0].deleted).toBe(true);
  });

  it('a stale re-add (lower rev) cannot resurrect a tombstone', () => {
    const server = [{ id: 'a', name: 'A', rev: 5, deleted: true, deletedAt: '2026-06-24T00:00:00.000Z' }];
    const client = [{ id: 'a', name: 'A', rev: 3 }]; // stale device, never saw the delete
    const merged = mergeCollection(server, client, 'id');
    expect(merged[0].deleted).toBe(true);
  });
});

describe('liveItems', () => {
  it('drops tombstoned items', () => {
    const items = [{ id: 'a', rev: 1 }, { id: 'b', rev: 2, deleted: true }];
    expect(liveItems(items).map(i => i.id)).toEqual(['a']);
  });
});

describe('prunedTombstones', () => {
  it('keeps live items and recent tombstones, drops old tombstones', () => {
    const now = Date.parse('2026-06-24T00:00:00.000Z');
    const items = [
      { id: 'live', rev: 1 },
      { id: 'recent', rev: 2, deleted: true, deletedAt: new Date(now - 5 * day).toISOString() },
      { id: 'old', rev: 2, deleted: true, deletedAt: new Date(now - 40 * day).toISOString() },
    ];
    const out = prunedTombstones(items, now);
    expect(out.map(i => i.id).sort()).toEqual(['live', 'recent']);
  });

  it('retains a tombstone with a missing or unparseable deletedAt (fail-safe)', () => {
    const now = Date.parse('2026-06-24T00:00:00.000Z');
    const items = [
      { id: 'noDate', rev: 2, deleted: true },
      { id: 'badDate', rev: 2, deleted: true, deletedAt: 'not-a-date' },
    ];
    expect(prunedTombstones(items, now).map(i => i.id).sort()).toEqual(['badDate', 'noDate']);
  });
});

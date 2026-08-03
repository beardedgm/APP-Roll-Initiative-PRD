import { describe, it, expect, beforeAll, afterEach, afterAll } from 'vitest';
import { startMemoryDb, clearMemoryDb, stopMemoryDb } from '../helpers/memoryDb.js';
import ProcessedEvent from '../../models/ProcessedEvent.js';
import { claimEvent, releaseEvent } from '../../utils/eventIdempotency.js';

beforeAll(startMemoryDb);
afterEach(clearMemoryDb);
afterAll(stopMemoryDb);

describe('claimEvent', () => {
  it('returns true the first time an event is claimed', async () => {
    expect(await claimEvent('evt_1')).toBe(true);
  });

  it('returns false for a duplicate claim of the same event', async () => {
    await claimEvent('evt_1');
    expect(await claimEvent('evt_1')).toBe(false);
  });

  it('records exactly one event so duplicates are detected', async () => {
    await claimEvent('evt_1');
    await claimEvent('evt_1');
    expect(await ProcessedEvent.countDocuments({ eventId: 'evt_1' })).toBe(1);
  });
});

describe('releaseEvent', () => {
  // This is the crux of the webhook idempotency bug: if a handler throws after
  // the event was claimed, the claim must be released so Stripe's retry can
  // reprocess it. Without release, the retry sees a duplicate and the event is
  // lost forever.
  it('removes a claimed event so a retry can reprocess it', async () => {
    expect(await claimEvent('evt_1')).toBe(true); // first delivery claims it
    await releaseEvent('evt_1');                   // handler failed -> release
    expect(await claimEvent('evt_1')).toBe(true);  // retry can claim again
  });

  it('is a best-effort no-op when the event was never claimed', async () => {
    await expect(releaseEvent('missing')).resolves.not.toThrow();
    expect(await ProcessedEvent.countDocuments()).toBe(0);
  });
});

// L22: two truly concurrent upserts on the unique eventId index can make the
// loser throw E11000 (documented Mongo upsert-race behavior). That must read
// as "already claimed" (false), never escape as a 500 to the webhook route.
describe('claimEvent concurrency', () => {
  it('concurrent claims of the same event yield exactly one true, no throw', async () => {
    const results = await Promise.all([
      claimEvent('evt_race'),
      claimEvent('evt_race'),
      claimEvent('evt_race'),
      claimEvent('evt_race'),
    ]);
    expect(results.filter(Boolean)).toHaveLength(1);
    expect(await ProcessedEvent.countDocuments({ eventId: 'evt_race' })).toBe(1);
  });
});

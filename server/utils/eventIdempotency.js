import ProcessedEvent from '../models/ProcessedEvent.js';
import logger from '../config/logger.js';

// Idempotency for webhook (or other at-least-once) event delivery, backed by the
// ProcessedEvent collection.
//
// claimEvent atomically records the event and reports whether THIS caller is the
// first to see it. releaseEvent undoes the claim so a retry can reprocess — call
// it when handling the event fails, otherwise a poisoned record makes every retry
// look like a duplicate and the event is lost.

/**
 * Atomically claim an event for processing.
 * @returns {Promise<boolean>} true if this is the first delivery (process it);
 *   false if the event was already claimed (skip as a duplicate).
 */
export async function claimEvent(eventId) {
  try {
    const existing = await ProcessedEvent.findOneAndUpdate(
      { eventId },
      { $setOnInsert: { eventId, processedAt: new Date() } },
      { upsert: true, returnDocument: 'before' }
    );
    return existing === null;
  } catch (err) {
    // Two truly concurrent upserts on the unique eventId index can make the
    // loser throw E11000 (documented Mongo upsert-race behavior). That means
    // someone else claimed it — a duplicate, not an error. Anything else is real.
    if (err.code === 11000) return false;
    throw err;
  }
}

/**
 * Release a previously claimed event so a retry can reprocess it. Best-effort:
 * a delete failure is logged, never thrown, so the caller can still return 500.
 */
export async function releaseEvent(eventId) {
  try {
    await ProcessedEvent.deleteOne({ eventId });
  } catch (err) {
    logger.error({ err, eventId }, 'Failed to release processed event for retry');
  }
}

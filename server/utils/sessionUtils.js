import mongoose from 'mongoose';
import logger from '../config/logger.js';

/**
 * Use a regex pre-filter on the serialised session JSON to narrow
 * candidates before parsing. The userId is stored as a 24-char hex
 * ObjectId string, so a substring match is safe — we still verify
 * with a parsed check to avoid false positives.
 */
async function findSessionIds(userId, excludeSessionId) {
  const db = mongoose.connection.db;
  const sessions = db.collection('sessions');
  const userIdStr = userId.toString();

  // Pre-filter: only fetch sessions whose JSON contains the userId string
  const cursor = sessions.find({
    session: { $regex: userIdStr },
  });

  const matchingIds = [];
  for await (const doc of cursor) {
    if (excludeSessionId && doc._id === excludeSessionId) continue;
    try {
      const parsed = JSON.parse(doc.session);
      if (parsed.userId === userIdStr) {
        matchingIds.push(doc._id);
      }
    } catch {
      // Skip documents with unparseable session data
    }
  }
  return matchingIds;
}

/**
 * Destroy all sessions for a user except the current one.
 * Used after password change so the user stays logged in
 * but all other sessions are invalidated.
 */
export async function destroyOtherSessions(userId, currentSessionId) {
  try {
    const matchingIds = await findSessionIds(userId, currentSessionId);
    if (matchingIds.length > 0) {
      const db = mongoose.connection.db;
      const result = await db.collection('sessions').deleteMany({ _id: { $in: matchingIds } });
      logger.info(
        { userId: userId.toString(), deletedCount: result.deletedCount },
        'Destroyed other sessions after credential change'
      );
    }
  } catch (err) {
    // Log but don't fail the request — password was already changed
    logger.error({ err }, 'Failed to destroy other sessions');
  }
}

/**
 * Destroy ALL sessions for a user.
 * Used after password reset (user has no current session to preserve).
 */
export async function destroyAllSessions(userId) {
  try {
    const matchingIds = await findSessionIds(userId);
    if (matchingIds.length > 0) {
      const db = mongoose.connection.db;
      const result = await db.collection('sessions').deleteMany({ _id: { $in: matchingIds } });
      logger.info({ userId: userId.toString(), deletedCount: result.deletedCount }, 'Destroyed all sessions after password reset');
    }
  } catch (err) {
    logger.error({ err }, 'Failed to destroy all sessions');
  }
}

import mongoose from 'mongoose';
import logger from '../config/logger.js';

/**
 * Destroy all sessions for a user except the current one.
 * Used after password change so the user stays logged in
 * but all other sessions are invalidated.
 */
export async function destroyOtherSessions(userId, currentSessionId) {
  try {
    const db = mongoose.connection.db;
    const sessions = db.collection('sessions');
    const userIdStr = userId.toString();

    // connect-mongo stores session data as a JSON string in the 'session' field.
    // Parse each session document and check the userId field explicitly
    // instead of using $regex which could match unrelated substrings.
    const matchingIds = [];
    const cursor = sessions.find({});

    for await (const doc of cursor) {
      if (doc._id === currentSessionId) continue;
      try {
        const parsed = JSON.parse(doc.session);
        if (parsed.userId === userIdStr) {
          matchingIds.push(doc._id);
        }
      } catch {
        // Skip documents with unparseable session data
      }
    }

    if (matchingIds.length > 0) {
      const result = await sessions.deleteMany({ _id: { $in: matchingIds } });
      logger.info(
        { userId: userIdStr, deletedCount: result.deletedCount },
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
    const db = mongoose.connection.db;
    const sessions = db.collection('sessions');
    const userIdStr = userId.toString();

    const matchingIds = [];
    const cursor = sessions.find({});

    for await (const doc of cursor) {
      try {
        const parsed = JSON.parse(doc.session);
        if (parsed.userId === userIdStr) {
          matchingIds.push(doc._id);
        }
      } catch {
        // Skip documents with unparseable session data
      }
    }

    if (matchingIds.length > 0) {
      const result = await sessions.deleteMany({ _id: { $in: matchingIds } });
      logger.info({ userId: userIdStr, deletedCount: result.deletedCount }, 'Destroyed all sessions after password reset');
    }
  } catch (err) {
    logger.error({ err }, 'Failed to destroy all sessions');
  }
}

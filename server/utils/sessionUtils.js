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
    // We match sessions containing this userId and exclude the current session.
    const result = await sessions.deleteMany({
      _id: { $ne: currentSessionId },
      session: { $regex: userIdStr },
    });

    if (result.deletedCount > 0) {
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

    const result = await sessions.deleteMany({
      session: { $regex: userIdStr },
    });

    if (result.deletedCount > 0) {
      logger.info({ userId: userIdStr, deletedCount: result.deletedCount }, 'Destroyed all sessions after password reset');
    }
  } catch (err) {
    logger.error({ err }, 'Failed to destroy all sessions');
  }
}

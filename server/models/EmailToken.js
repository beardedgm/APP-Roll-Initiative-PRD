import mongoose from 'mongoose';
import crypto from 'crypto';

const EmailTokenSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  // Stores sha256(rawToken) — never the raw token. Anyone with read access to
  // this collection (backup, replica, log) must not be able to redeem a live
  // verify/reset link. The raw token exists only in the email we send.
  token:  { type: String, required: true, unique: true },
  type:   { type: String, enum: ['verify-email', 'reset-password'], required: true },
  expiresAt: { type: Date, required: true },
}, { timestamps: true });

EmailTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
EmailTokenSchema.index({ userId: 1, type: 1 });

/** sha256 hex digest of a raw token. Deterministic — used for storage and lookup. */
export function hashToken(rawToken) {
  return crypto.createHash('sha256').update(rawToken).digest('hex');
}

/**
 * Generate a token for a user. The DOC stores the hash; the returned object
 * carries the RAW token for the outgoing email — callers read `.token`.
 */
EmailTokenSchema.statics.generate = async function (userId, type, ttlMinutes = 60) {
  const rawToken = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000);

  // Remove any existing token of same type for this user
  await this.deleteMany({ userId, type });

  await this.create({ userId, token: hashToken(rawToken), type, expiresAt });
  return { token: rawToken, expiresAt };
};

/** Look up a stored token by its RAW value (hashes before querying). */
EmailTokenSchema.statics.findByRawToken = function (rawToken, type) {
  return this.findOne({ token: hashToken(rawToken), type });
};

const EmailToken = mongoose.model('EmailToken', EmailTokenSchema);
export default EmailToken;

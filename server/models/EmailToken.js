import mongoose from 'mongoose';
import crypto from 'crypto';

const EmailTokenSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  token:  { type: String, required: true, unique: true },
  type:   { type: String, enum: ['verify-email', 'reset-password'], required: true },
  expiresAt: { type: Date, required: true },
}, { timestamps: true });

EmailTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
EmailTokenSchema.index({ userId: 1, type: 1 });

EmailTokenSchema.statics.generate = async function (userId, type, ttlMinutes = 60) {
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000);

  // Remove any existing token of same type for this user
  await this.deleteMany({ userId, type });

  return this.create({ userId, token, type, expiresAt });
};

const EmailToken = mongoose.model('EmailToken', EmailTokenSchema);
export default EmailToken;

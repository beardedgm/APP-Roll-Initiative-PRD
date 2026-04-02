import mongoose from 'mongoose';
import crypto from 'crypto';

const UserSchema = new mongoose.Schema({
  email:          { type: String, required: true, unique: true, lowercase: true, trim: true },
  hashedPassword: { type: String, required: true },
  salt:           { type: String, required: true },
  displayName:    { type: String, required: true, trim: true },
  role:           { type: String, enum: ['user', 'owner'], default: 'user' },
  emailVerified:   { type: Boolean, default: false },
  emailBounced:    { type: Boolean, default: false },
  emailSuppressed: { type: Boolean, default: false },

  // Stripe / subscription
  stripeCustomerId:   { type: String, sparse: true },
  subscriptionStatus: { type: String, enum: ['none', 'active', 'past_due', 'canceled'], default: 'none' },
  subscriptionId:     { type: String },
  currentPeriodEnd:   { type: Date },
}, { timestamps: true });

// email index created by `unique: true`, stripeCustomerId by `sparse: true`

// ── Password hashing via crypto.scrypt ──────────────────────

UserSchema.statics.hashPassword = function (password) {
  return new Promise((resolve, reject) => {
    const salt = crypto.randomBytes(16).toString('hex');
    crypto.scrypt(password, salt, 64, (err, derivedKey) => {
      if (err) return reject(err);
      resolve({ hashedPassword: derivedKey.toString('hex'), salt });
    });
  });
};

UserSchema.methods.verifyPassword = function (password) {
  return new Promise((resolve, reject) => {
    crypto.scrypt(password, this.salt, 64, (err, derivedKey) => {
      if (err) return reject(err);
      resolve(crypto.timingSafeEqual(
        Buffer.from(this.hashedPassword, 'hex'),
        derivedKey,
      ));
    });
  });
};

// Never return password fields in JSON
UserSchema.methods.toSafeJSON = function () {
  const { hashedPassword: _hp, salt: _s, __v: _v, ...obj } = this.toObject();
  return obj;
};

const User = mongoose.model('User', UserSchema);
export default User;

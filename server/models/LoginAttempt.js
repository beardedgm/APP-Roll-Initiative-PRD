import mongoose from 'mongoose';

const LoginAttemptSchema = new mongoose.Schema({
  ip:    { type: String, required: true },
  email: { type: String, required: true, lowercase: true },
  // Discriminates real auth attempts from rateLimitByIP action rows (synthetic
  // __<action>__ emails). The auth limiter counts only kind:'auth' so ordinary
  // browsing (health probes, shared-view polling) can never lock out login.
  // TTL empties the collection in 15 min, so no migration is needed.
  kind:  { type: String, enum: ['auth', 'action'], default: 'auth' },
  at:    { type: Date, default: Date.now, expires: 900 }, // TTL: 15 min
});

LoginAttemptSchema.index({ ip: 1, email: 1 });
LoginAttemptSchema.index({ ip: 1, at: 1 });     // auth per-IP window count
LoginAttemptSchema.index({ email: 1, at: 1 });  // auth per-email window count

const LoginAttempt = mongoose.model('LoginAttempt', LoginAttemptSchema);
export default LoginAttempt;

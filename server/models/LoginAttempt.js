import mongoose from 'mongoose';

const LoginAttemptSchema = new mongoose.Schema({
  ip:    { type: String, required: true },
  email: { type: String, required: true, lowercase: true },
  at:    { type: Date, default: Date.now, expires: 900 }, // TTL: 15 min
});

LoginAttemptSchema.index({ ip: 1, email: 1 });

const LoginAttempt = mongoose.model('LoginAttempt', LoginAttemptSchema);
export default LoginAttempt;

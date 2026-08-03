import dns from 'dns';
import mongoose from 'mongoose';
import logger from './logger.js';

// Use Google DNS for SRV lookups — ISP DNS can fail with Node's c-ares resolver
dns.setServers(['8.8.8.8', '8.8.4.4']);

export async function connectDB() {
  // Set BEFORE connecting, unconditionally: if a dev-mode failed connect later
  // recovers via Mongoose's buffering, queries must never run unsanitized.
  mongoose.set('sanitizeFilter', true);
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    logger.info(`MongoDB connected: ${conn.connection.host}`);
    return true;
  } catch (err) {
    logger.error({ err }, 'MongoDB connection failed');
    if (process.env.NODE_ENV === 'production') {
      process.exit(1);
    }
    logger.warn('Server starting without database — API routes will fail');
    return false;
  }
}

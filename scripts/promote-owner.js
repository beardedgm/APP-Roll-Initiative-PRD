/**
 * Promote a user to the 'owner' role.
 *
 * Usage:
 *   node scripts/promote-owner.js user@example.com
 *
 * Requires MONGODB_URI in .env (or as an env var).
 */
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const email = process.argv[2];
if (!email) {
  console.error('Usage: node scripts/promote-owner.js <email>');
  process.exit(1);
}

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error('MONGODB_URI is not set');
  process.exit(1);
}

await mongoose.connect(uri);

const result = await mongoose.connection.db
  .collection('users')
  .findOneAndUpdate(
    { email: email.toLowerCase().trim() },
    { $set: { role: 'owner' } },
    { returnDocument: 'after' },
  );

if (!result) {
  console.error(`No user found with email: ${email}`);
  process.exit(1);
}

console.log(`Promoted ${result.email} (${result._id}) to owner`);
await mongoose.disconnect();

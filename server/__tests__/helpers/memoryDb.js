import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';

let mongod;

/** Start an in-memory MongoDB and connect mongoose to it. Call in beforeAll. */
export async function startMemoryDb() {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
}

/** Drop all data between tests. Call in afterEach. */
export async function clearMemoryDb() {
  const { collections } = mongoose.connection;
  for (const key of Object.keys(collections)) {
    await collections[key].deleteMany({});
  }
}

/** Disconnect and stop the server. Call in afterAll. */
export async function stopMemoryDb() {
  await mongoose.disconnect();
  if (mongod) await mongod.stop();
}

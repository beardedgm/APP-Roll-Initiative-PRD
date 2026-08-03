import { describe, it, expect, beforeAll, afterEach, afterAll } from 'vitest';
import mongoose from 'mongoose';
import { startMemoryDb, clearMemoryDb, stopMemoryDb } from '../helpers/memoryDb.js';
import EmailToken, { hashToken } from '../../models/EmailToken.js';

// L16: tokens must be hashed at rest — anyone with read access to the
// collection (backup, replica, log) must not be able to redeem a live
// verify/reset link. The raw token exists only in the outgoing email.
describe('EmailToken hashing', () => {
  beforeAll(startMemoryDb);
  afterEach(clearMemoryDb);
  afterAll(stopMemoryDb);

  it('hashToken is deterministic and not the identity', () => {
    expect(hashToken('abc')).toBe(hashToken('abc'));
    expect(hashToken('abc')).not.toBe('abc');
    expect(hashToken('abc')).toMatch(/^[a-f0-9]{64}$/);
  });

  it('generate returns the raw token but stores only its hash', async () => {
    const userId = new mongoose.Types.ObjectId();
    const { token: raw } = await EmailToken.generate(userId, 'reset-password', 60);

    const doc = await EmailToken.findOne({ userId }).lean();
    expect(doc.token).not.toBe(raw);          // plaintext is NOT at rest
    expect(doc.token).toBe(hashToken(raw));   // the hash is
  });

  it('findByRawToken redeems the raw token; a plaintext lookup finds nothing', async () => {
    const userId = new mongoose.Types.ObjectId();
    const { token: raw } = await EmailToken.generate(userId, 'verify-email', 60);

    const found = await EmailToken.findByRawToken(raw, 'verify-email');
    expect(found).toBeTruthy();
    expect(String(found.userId)).toBe(String(userId));

    // A DB reader who exfiltrated the stored value cannot use it as a token…
    const stored = (await EmailToken.findOne({ userId }).lean()).token;
    expect(await EmailToken.findByRawToken(stored, 'verify-email')).toBeNull();
    // …and the raw token never matches via direct equality on the collection.
    expect(await EmailToken.findOne({ token: raw }).lean()).toBeNull();
  });

  it('generate replaces any prior token of the same type', async () => {
    const userId = new mongoose.Types.ObjectId();
    const first = await EmailToken.generate(userId, 'reset-password', 60);
    const second = await EmailToken.generate(userId, 'reset-password', 60);

    expect(await EmailToken.countDocuments({ userId })).toBe(1);
    expect(await EmailToken.findByRawToken(first.token, 'reset-password')).toBeNull();
    expect(await EmailToken.findByRawToken(second.token, 'reset-password')).toBeTruthy();
  });
});

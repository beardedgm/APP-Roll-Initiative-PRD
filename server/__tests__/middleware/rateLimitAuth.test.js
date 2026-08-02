import { describe, it, expect, vi, beforeAll, afterEach, afterAll } from 'vitest';
import { startMemoryDb, clearMemoryDb, stopMemoryDb } from '../helpers/memoryDb.js';
import LoginAttempt from '../../models/LoginAttempt.js';
import rateLimitAuth from '../../middleware/rateLimitAuth.js';

function mockRes() {
  return { statusCode: 200, body: null, status(c) { this.statusCode = c; return this; }, json(b) { this.body = b; return this; } };
}

async function attempt(ip, email) {
  const req = { ip, body: { email } };
  const res = mockRes();
  const next = vi.fn();
  await rateLimitAuth(req, res, next);
  return { res, next };
}

// H2: rateLimitByIP writes synthetic-email rows (kind:'action') into the same
// LoginAttempt collection — e.g. one row per 2s shared-view poll. The auth
// limiter must only count real auth attempts (kind:'auth'), or ~30 seconds of
// watching a shared encounter locks the IP out of login entirely.
describe('rateLimitAuth', () => {
  beforeAll(startMemoryDb);
  afterEach(clearMemoryDb);
  afterAll(stopMemoryDb);

  it('ignores kind:action rows written by the general limiter', async () => {
    const rows = Array.from({ length: 20 }, () => ({
      ip: '1.1.1.1', email: '__shared-encounter__', kind: 'action',
    }));
    await LoginAttempt.insertMany(rows);

    const { next, res } = await attempt('1.1.1.1', 'dm@example.com');
    expect(next).toHaveBeenCalled();
    expect(res.statusCode).toBe(200);
  });

  it('429s after 15 real auth attempts from one IP', async () => {
    const rows = Array.from({ length: 15 }, (_, i) => ({
      ip: '2.2.2.2', email: `probe${i}@example.com`, kind: 'auth',
    }));
    await LoginAttempt.insertMany(rows);

    const { next, res } = await attempt('2.2.2.2', 'dm@example.com');
    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(429);
  });

  it('429s after 5 auth attempts for one email across different IPs', async () => {
    const rows = Array.from({ length: 5 }, (_, i) => ({
      ip: `3.3.3.${i}`, email: 'victim@example.com', kind: 'auth',
    }));
    await LoginAttempt.insertMany(rows);

    const { next, res } = await attempt('9.9.9.9', 'victim@example.com');
    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(429);
  });

  // L11: the window must be enforced by the query's `at` predicate, not by
  // Mongo's TTL sweeper (which runs ~every 60s and lags under load).
  it('does not count rows older than the 15-minute window', async () => {
    const stale = new Date(Date.now() - 16 * 60 * 1000);
    const rows = Array.from({ length: 20 }, (_, i) => ({
      ip: '4.4.4.4', email: `old${i}@example.com`, kind: 'auth', at: stale,
    }));
    await LoginAttempt.insertMany(rows);

    const { next, res } = await attempt('4.4.4.4', 'dm@example.com');
    expect(next).toHaveBeenCalled();
    expect(res.statusCode).toBe(200);
  });

  it('records the attempt as kind:auth', async () => {
    await attempt('5.5.5.5', 'dm@example.com');
    const row = await LoginAttempt.findOne({ ip: '5.5.5.5' }).lean();
    expect(row.kind).toBe('auth');
    expect(row.email).toBe('dm@example.com');
  });
});

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import verifyTurnstile from '../../middleware/verifyTurnstile.js';

function mockRes() {
  return {
    statusCode: 200,
    body: null,
    status(code) { this.statusCode = code; return this; },
    json(payload) { this.body = payload; return this; },
  };
}

const ORIGINAL_ENV = process.env.NODE_ENV;
const ORIGINAL_SECRET = process.env.TURNSTILE_SECRET_KEY;

beforeEach(() => { delete process.env.TURNSTILE_SECRET_KEY; });
afterEach(() => {
  process.env.NODE_ENV = ORIGINAL_ENV;
  if (ORIGINAL_SECRET === undefined) delete process.env.TURNSTILE_SECRET_KEY;
  else process.env.TURNSTILE_SECRET_KEY = ORIGINAL_SECRET;
});

// l9: with no secret the middleware skipped verification — fine in dev, but in
// production a missing secret must NOT silently disable bot protection.
describe('verifyTurnstile — missing secret', () => {
  it('fails closed (503) in production', async () => {
    process.env.NODE_ENV = 'production';
    const res = mockRes();
    const next = vi.fn();
    await verifyTurnstile({ body: {}, ip: '1.2.3.4' }, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(503);
  });

  it('skips verification in development', async () => {
    process.env.NODE_ENV = 'development';
    const res = mockRes();
    const next = vi.fn();
    await verifyTurnstile({ body: {}, ip: '1.2.3.4' }, res, next);
    expect(next).toHaveBeenCalled();
    expect(res.statusCode).toBe(200);
  });
});

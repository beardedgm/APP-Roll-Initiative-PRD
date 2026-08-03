import { describe, it, expect, vi, afterEach } from 'vitest';

// Sentry import in errorHandler must not hit the network in tests.
vi.mock('@sentry/node', () => ({ captureException: vi.fn() }));

import errorHandler from '../../middleware/errorHandler.js';

function run(err, env) {
  const prev = process.env.NODE_ENV;
  if (env !== undefined) process.env.NODE_ENV = env;
  const res = {
    statusCode: null,
    body: null,
    status(c) { this.statusCode = c; return this; },
    json(b) { this.body = b; return this; },
  };
  errorHandler(err, { method: 'GET', originalUrl: '/x' }, res, () => {});
  process.env.NODE_ENV = prev;
  return res;
}

// L13: Mongoose ValidationError messages embed schema paths and rejected
// values — they must not reach clients in production (the 500 path already
// masks; the 400 ValidationError path did not).
describe('errorHandler ValidationError masking', () => {
  afterEach(() => vi.restoreAllMocks());

  const validationErr = Object.assign(new Error('User validation failed: email: Path `email` is invalid (secret@internal)'), { name: 'ValidationError' });

  it('includes details outside production', () => {
    const res = run(validationErr, 'test');
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe('Validation failed');
    expect(res.body.details).toContain('email');
  });

  it('masks details in production', () => {
    const res = run(validationErr, 'production');
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe('Validation failed');
    expect(res.body.details).toBeUndefined();
  });

  it('still masks generic 500s in production', () => {
    const res = run(new Error('stack internals here'), 'production');
    expect(res.statusCode).toBe(500);
    expect(res.body.error).toBe('Internal server error');
  });
});

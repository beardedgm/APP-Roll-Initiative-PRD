import { describe, it, expect, vi } from 'vitest';
import { rateLimitMemory } from '../../middleware/rateLimitMemory.js';

function mockRes() {
  return { statusCode: 200, status(c) { this.statusCode = c; return this; }, json() { return this; } };
}
function run(mw, ip) {
  const res = mockRes();
  const next = vi.fn();
  mw({ ip }, res, next);
  return { res, next };
}

// f12: the public catalog needs a rate limiter that doesn't hit the DB on every
// request (unlike rateLimitByIP). This in-memory limiter caps per-IP request
// volume with no DB cost.
describe('rateLimitMemory', () => {
  it('allows up to the cap, then 429s', () => {
    const mw = rateLimitMemory('test-cap', 3);
    for (let i = 0; i < 3; i++) {
      expect(run(mw, '1.1.1.1').next).toHaveBeenCalled();
    }
    const { res, next } = run(mw, '1.1.1.1');
    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(429);
  });

  it('tracks each IP independently', () => {
    const mw = rateLimitMemory('test-ip', 1);
    expect(run(mw, '2.2.2.2').next).toHaveBeenCalled();       // first from A: ok
    expect(run(mw, '2.2.2.2').res.statusCode).toBe(429);      // second from A: blocked
    expect(run(mw, '3.3.3.3').next).toHaveBeenCalled();       // first from B: ok
  });

  // H1: monsters and spells each get their own budget — exhausting one action
  // key must not consume another's (they share the module-level store Map).
  it('tracks each action key independently for the same IP', () => {
    const a = rateLimitMemory('test-key-a', 1);
    const b = rateLimitMemory('test-key-b', 1);
    expect(run(a, '4.4.4.4').next).toHaveBeenCalled();        // a: ok
    expect(run(a, '4.4.4.4').res.statusCode).toBe(429);       // a: exhausted
    expect(run(b, '4.4.4.4').next).toHaveBeenCalled();        // b: unaffected
  });
});

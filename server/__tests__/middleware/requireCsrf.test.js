import { describe, it, expect, vi } from 'vitest';
import requireCsrf from '../../middleware/requireCsrf.js';

function mockRes() {
  const res = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
}

describe('requireCsrf', () => {
  it.each(['GET', 'HEAD', 'OPTIONS'])('allows %s without header', (method) => {
    const req = { method, headers: {} };
    const res = mockRes();
    const next = vi.fn();
    requireCsrf(req, res, next);
    expect(next).toHaveBeenCalledOnce();
  });

  it('allows POST when X-Requested-With is XMLHttpRequest', () => {
    const req = { method: 'POST', headers: { 'x-requested-with': 'XMLHttpRequest' } };
    const res = mockRes();
    const next = vi.fn();
    requireCsrf(req, res, next);
    expect(next).toHaveBeenCalledOnce();
  });

  it('rejects POST without the X-Requested-With header (403)', () => {
    const req = { method: 'POST', headers: {} };
    const res = mockRes();
    const next = vi.fn();
    requireCsrf(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: 'Missing CSRF header' });
    expect(next).not.toHaveBeenCalled();
  });

  it('rejects POST with the wrong header value', () => {
    const req = { method: 'POST', headers: { 'x-requested-with': 'fetch' } };
    const res = mockRes();
    const next = vi.fn();
    requireCsrf(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it.each(['PUT', 'PATCH', 'DELETE'])('rejects %s without the header', (method) => {
    const req = { method, headers: {} };
    const res = mockRes();
    const next = vi.fn();
    requireCsrf(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
  });
});

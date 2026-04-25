import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../models/User.js', () => ({
  default: { findById: vi.fn() },
}));

const { default: requireSubscription } = await import('../../middleware/requireSubscription.js');
const { default: User } = await import('../../models/User.js');

function mockRes() {
  const res = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
}

function userQuery(user) {
  return { select: vi.fn().mockResolvedValue(user) };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('requireSubscription', () => {
  it('returns 401 when no session userId', async () => {
    const req = { session: {} };
    const res = mockRes();
    const next = vi.fn();
    await requireSubscription(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 401 when user not found', async () => {
    User.findById.mockReturnValue(userQuery(null));
    const req = { session: { userId: 'missing' } };
    const res = mockRes();
    const next = vi.fn();
    await requireSubscription(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('allows owners regardless of subscription', async () => {
    User.findById.mockReturnValue(userQuery({ role: 'owner', subscriptionStatus: 'none' }));
    const req = { session: { userId: 'owner-1' } };
    const res = mockRes();
    const next = vi.fn();
    await requireSubscription(req, res, next);
    expect(next).toHaveBeenCalledOnce();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('allows users with active subscription', async () => {
    User.findById.mockReturnValue(userQuery({ role: 'user', subscriptionStatus: 'active' }));
    const req = { session: { userId: 'sub-1' } };
    const res = mockRes();
    const next = vi.fn();
    await requireSubscription(req, res, next);
    expect(next).toHaveBeenCalledOnce();
  });

  it('rejects users without subscription with 403', async () => {
    User.findById.mockReturnValue(userQuery({ role: 'user', subscriptionStatus: 'none' }));
    const req = { session: { userId: 'free-1' } };
    const res = mockRes();
    const next = vi.fn();
    await requireSubscription(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it('rejects past_due users', async () => {
    User.findById.mockReturnValue(userQuery({ role: 'user', subscriptionStatus: 'past_due' }));
    const req = { session: { userId: 'pd-1' } };
    const res = mockRes();
    const next = vi.fn();
    await requireSubscription(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('rejects canceled users', async () => {
    User.findById.mockReturnValue(userQuery({ role: 'user', subscriptionStatus: 'canceled' }));
    const req = { session: { userId: 'c-1' } };
    const res = mockRes();
    const next = vi.fn();
    await requireSubscription(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
  });
});

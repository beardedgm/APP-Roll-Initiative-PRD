import { describe, it, expect } from 'vitest';
import { toSafeSharedRoll } from '../../routes/encounters.js';

// The shared player view is public and unauthenticated. The full dice roll
// (label, modifier, individual faces) must never reach it — only the result
// plus a crit flag for the nat-20/nat-1 highlight.
const fullRoll = {
  id: 'r1',
  label: '1d20+7',
  sides: 20,
  count: 1,
  modifier: 7,
  advantage: 'normal',
  rolls: [15],
  total: 22,
  timestamp: 1700000000000,
};

describe('toSafeSharedRoll', () => {
  it('returns null when there is no roll', () => {
    expect(toSafeSharedRoll(null)).toBeNull();
    expect(toSafeSharedRoll(undefined)).toBeNull();
  });

  it('exposes only id, total, timestamp, and crit', () => {
    expect(Object.keys(toSafeSharedRoll(fullRoll)).sort()).toEqual(['crit', 'id', 'timestamp', 'total']);
  });

  it('never leaks the modifier, label, or individual die faces', () => {
    const safe = toSafeSharedRoll(fullRoll);
    expect(safe.label).toBeUndefined();
    expect(safe.modifier).toBeUndefined();
    expect(safe.rolls).toBeUndefined();
    expect(safe.sides).toBeUndefined();
    expect(safe.total).toBe(22);
  });

  it('flags a natural 20 on a d20', () => {
    expect(toSafeSharedRoll({ ...fullRoll, rolls: [20], total: 27 }).crit).toBe('nat20');
  });

  it('flags a natural 1 on a d20', () => {
    expect(toSafeSharedRoll({ ...fullRoll, rolls: [1], total: 8 }).crit).toBe('nat1');
  });

  it('flags a nat 20 on either die (advantage)', () => {
    expect(toSafeSharedRoll({ ...fullRoll, advantage: 'advantage', rolls: [20, 4] }).crit).toBe('nat20');
  });

  it('does not flag crits on non-d20 rolls', () => {
    expect(toSafeSharedRoll({ ...fullRoll, sides: 6, rolls: [1] }).crit).toBeNull();
    expect(toSafeSharedRoll({ ...fullRoll, sides: 12, rolls: [20] }).crit).toBeNull();
  });
});

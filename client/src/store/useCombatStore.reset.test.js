import { describe, it, expect, beforeEach } from 'vitest';
import useCombatStore from './useCombatStore';

const get = () => useCombatStore.getState();

beforeEach(() => {
  get().clearAll();
});

// clearAll must scrub every per-user field on logout (finding f2) — including
// the cloud identifiers and the latest shared roll — so the next account on a
// shared browser starts clean and can't push into the previous user's encounter.
describe('clearAll — account isolation', () => {
  it('resets cloud identifiers and share code', () => {
    get().setCloudId('cloudA');
    get().setCloudRev(5);
    get().setShareCode('deadbeef');

    get().clearAll();

    expect(get().cloudId).toBeNull();
    expect(get().cloudRev).toBe(0);
    expect(get().shareCode).toBeNull();
  });

  it('clears the latest shared roll so it does not leak to the next user', () => {
    get().toggleShowRolls(); // showRollsToPlayers = true
    get().rollDice({ sides: 20, count: 1, modifier: 3, advantage: 'normal' });
    expect(get().latestSharedRoll).not.toBeNull();

    get().clearAll();

    expect(get().latestSharedRoll).toBeNull();
  });
});

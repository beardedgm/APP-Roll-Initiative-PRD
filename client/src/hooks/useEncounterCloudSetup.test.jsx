import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';

vi.mock('../api/useEncounters', () => ({
  useEncounters: vi.fn(),
  useEncounter: vi.fn(),
  useCreateEncounter: vi.fn(),
}));
vi.mock('./useCloudSync', () => ({ default: vi.fn() }));

import { useEncounters, useEncounter, useCreateEncounter } from '../api/useEncounters';
import useEncounterCloudSetup from './useEncounterCloudSetup';
import useCombatStore from '../store/useCombatStore';

const subscriber = { role: 'user', subscriptionStatus: 'active' };

beforeEach(() => {
  useCombatStore.getState().clearAll();
  useEncounters.mockReset();
  useEncounter.mockReset();
  // Safe defaults so a lingering render from the previous test never sees an
  // undefined hook return; each test overrides with its own data.
  useEncounters.mockReturnValue({ data: undefined, isLoading: true });
  useEncounter.mockReturnValue({ data: undefined, isLoading: false });
  useCreateEncounter.mockReturnValue({ mutate: vi.fn() });
});

// M5: loadSnapshot spreads over current state, so omitted keys KEEP stale
// values. Loading a cloud encounter must adopt the server's share state —
// otherwise the store retains a shareCode from a different (or deleted)
// encounter, ShareLinkModal shows/revokes the wrong link, and a leftover
// showRollsToPlayers:true broadcasts rolls to an old encounter's viewers.
describe('useEncounterCloudSetup — share state on cloud load (M5)', () => {
  it('adopts the server shareCode and resets showRollsToPlayers', async () => {
    // Simulate stale local state from a previous/deleted encounter.
    useCombatStore.setState({ shareCode: 'stale-old-code', showRollsToPlayers: true });

    useEncounters.mockReturnValue({
      data: [{ _id: 'enc1', name: 'Cloud Encounter' }],
      isLoading: false,
    });
    useEncounter.mockReturnValue({
      data: {
        _id: 'enc1',
        name: 'Cloud Encounter',
        state: 'combat',
        currentRound: 3,
        activeCreatureId: 'c1',
        combatants: [],
        diceHistory: [],
        shareCode: 'abc123def456',
        rev: 7,
      },
      isLoading: false,
    });

    renderHook(() => useEncounterCloudSetup(subscriber));

    await waitFor(() => {
      expect(useCombatStore.getState().cloudId).toBe('enc1');
    });
    const s = useCombatStore.getState();
    expect(s.shareCode).toBe('abc123def456');   // server wins over stale value
    expect(s.showRollsToPlayers).toBe(false);   // local-only toggle never carries over
    expect(s.currentRound).toBe(3);
  });

  it('clears a stale shareCode when the loaded encounter is unshared', async () => {
    useCombatStore.setState({ shareCode: 'stale-old-code' });

    useEncounters.mockReturnValue({
      data: [{ _id: 'enc2', name: 'Unshared' }],
      isLoading: false,
    });
    useEncounter.mockReturnValue({
      data: {
        _id: 'enc2',
        name: 'Unshared',
        state: 'pre-combat',
        currentRound: 1,
        activeCreatureId: null,
        combatants: [],
        diceHistory: [],
        rev: 0,
      },
      isLoading: false,
    });

    renderHook(() => useEncounterCloudSetup(subscriber));

    await waitFor(() => {
      expect(useCombatStore.getState().cloudId).toBe('enc2');
    });
    expect(useCombatStore.getState().shareCode).toBeNull();
  });
});

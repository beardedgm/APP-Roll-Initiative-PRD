import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

vi.mock('../api/useEncounters', () => ({ useUpdateEncounter: vi.fn() }));
vi.mock('@sentry/react', () => ({ captureException: vi.fn() }));

import { useUpdateEncounter } from '../api/useEncounters';
import useCloudSync, { useSyncStatus } from './useCloudSync';
import useCombatStore from '../store/useCombatStore';

beforeEach(() => {
  useCombatStore.getState().clearAll();
  useUpdateEncounter.mockReset();
});

// f9: the "show rolls to players" feature was dead over /play/:code because the
// cloud sync never sent latestSharedRoll — the server supports it, the client
// just omitted it from the PUT payload.
describe('useCloudSync — latestSharedRoll', () => {
  it('includes latestSharedRoll in the encounter sync payload', async () => {
    const mutateAsync = vi.fn().mockResolvedValue({ rev: 2 });
    useUpdateEncounter.mockReturnValue({ mutateAsync });

    useCombatStore.setState({
      cloudId: 'enc1',
      cloudRev: 1,
      latestSharedRoll: { id: 'r1', label: '1d20+5', total: 18, timestamp: 123 },
    });

    renderHook(() => useCloudSync(true));
    await act(async () => {
      await useSyncStatus.getState().triggerSync();
    });

    expect(mutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'enc1',
        latestSharedRoll: expect.objectContaining({ id: 'r1', total: 18 }),
      }),
    );
  });
});

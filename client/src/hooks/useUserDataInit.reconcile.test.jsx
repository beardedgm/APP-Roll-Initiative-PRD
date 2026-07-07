import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';

vi.mock('../api/useUserData', () => ({ useUserData: vi.fn() }));
vi.mock('../api/axiosInstance', () => ({ default: { put: vi.fn() } }));
vi.mock('@sentry/react', () => ({ captureException: vi.fn(), captureMessage: vi.fn() }));

import { useUserData } from '../api/useUserData';
import api from '../api/axiosInstance';
import useUserDataInit from './useUserDataInit';
import useUserDataStore from '../store/useUserDataStore';

beforeEach(() => {
  useUserDataStore.getState().resetAll();
  api.put.mockReset();
  useUserData.mockReset();
});

// f4: when the server had data, init did a wholesale loadFromServer(serverData),
// erasing any unsynced local data. It must instead reconcile via the server's
// rev-merge: push local, then adopt the merged result.
describe('useUserDataInit — load-time reconcile (f4)', () => {
  it('merges local data with server data instead of overwriting it', async () => {
    // Local has a character the server doesn't know about yet.
    useUserDataStore.getState().addCharacter({ id: 'local1', name: 'Local Hero', type: 'player' });

    useUserData.mockReturnValue({ data: {
      characters: [{ id: 'server1', name: 'Server Hero', type: 'player', rev: 1, deleted: false }],
      customMonsters: [], encounterPresets: [], version: 5,
    } });
    // The push merges both; the server echoes the union.
    api.put.mockResolvedValue({ data: {
      characters: [
        { id: 'server1', name: 'Server Hero', type: 'player', rev: 1, deleted: false },
        { id: 'local1', name: 'Local Hero', type: 'player', rev: 1, deleted: false },
      ],
      customMonsters: [], encounterPresets: [], version: 6,
    } });

    renderHook(() => useUserDataInit(true));

    await waitFor(() => {
      const names = useUserDataStore.getState().characters.map((c) => c.name);
      expect(names).toContain('Local Hero'); // preserved (was clobbered before)
      expect(names).toContain('Server Hero'); // adopted from merge
    });
    expect(api.put).toHaveBeenCalled();
  });
});

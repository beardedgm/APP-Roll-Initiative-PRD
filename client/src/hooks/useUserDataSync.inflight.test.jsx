import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

vi.mock('../api/axiosInstance', () => ({ default: { put: vi.fn() } }));
vi.mock('@sentry/react', () => ({ captureException: vi.fn(), captureMessage: vi.fn() }));

import api from '../api/axiosInstance';
import useUserDataSync from './useUserDataSync';
import useUserDataStore from '../store/useUserDataStore';

beforeEach(() => {
  useUserDataStore.getState().resetAll();
  api.put.mockReset();
});
afterEach(() => vi.useRealTimers());

// f3: on PUT success the hook wholesale-replaced the store with the server view
// (which reflects the pre-edit payload), discarding any edit made while the PUT
// was in flight. The fix must detect the in-flight change and NOT clobber it.
describe('useUserDataSync — in-flight edits', () => {
  it('preserves a character added while the PUT is in flight', async () => {
    let resolvePut;
    api.put.mockImplementation(() => new Promise((res) => { resolvePut = res; }));

    // Loaded, with one synced character.
    useUserDataStore.getState().loadFromServer({
      characters: [], customMonsters: [], encounterPresets: [], version: 1,
    });
    useUserDataStore.getState().addCharacter({ id: 'a', name: 'Aria', type: 'player' });

    renderHook(() => useUserDataSync(true));

    // Kick off a sync (captures a payload of just Aria), then edit mid-flight.
    await act(async () => { useUserDataStore.getState().triggerSync(); });
    act(() => { useUserDataStore.getState().addCharacter({ id: 'b', name: 'Borin', type: 'player' }); });

    // Server replies with the pre-edit view (Aria only).
    await act(async () => {
      resolvePut({ data: {
        characters: [{ id: 'a', name: 'Aria', type: 'player', rev: 1, deleted: false }],
        customMonsters: [], encounterPresets: [], version: 2,
      } });
      await Promise.resolve();
    });

    const names = useUserDataStore.getState().characters.map((c) => c.name);
    expect(names).toContain('Aria');
    expect(names).toContain('Borin'); // would be lost by the old wholesale replace
  });
});

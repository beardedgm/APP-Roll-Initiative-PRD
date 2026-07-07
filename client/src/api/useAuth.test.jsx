import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, cleanup } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Mock the network + analytics so the hooks run in isolation.
vi.mock('./axiosInstance', () => ({
  default: {
    post: vi.fn(() => Promise.resolve({ data: {} })),
    delete: vi.fn(() => Promise.resolve({ data: {} })),
  },
}));
vi.mock('../lib/analytics', () => ({
  identifyUser: vi.fn(),
  resetUser: vi.fn(),
}));

import { useLogout, useDeleteAccount } from './useAuth';
import useUserDataStore from '../store/useUserDataStore';
import useCombatStore from '../store/useCombatStore';

function makeWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  // Seed a per-user server cache that must be dropped.
  qc.setQueryData(['user-data'], { characters: [{ id: 'x', name: 'NotYours' }] });
  qc.setQueryData(['encounters'], [{ cloudId: 'encA' }]);
  const wrapper = ({ children }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
  return { qc, wrapper };
}

function seedUserAData() {
  useUserDataStore.getState().addCharacter({ name: 'Aria', type: 'player' });
  useUserDataStore.getState().loadFromServer({ characters: [{ id: 'a', name: 'Aria' }], version: 3 });
  useCombatStore.getState().setCloudId('cloudA');
  useCombatStore.getState().setCloudRev(7);
  useCombatStore.getState().setShareCode('shareA');
}

beforeEach(() => {
  useUserDataStore.getState().resetAll?.();
  useCombatStore.getState().clearAll();
  localStorage.clear();
});
afterEach(cleanup);

describe('useLogout — account isolation (f2)', () => {
  it('wipes user data, combat cloud state, persisted storage, and server caches', async () => {
    seedUserAData();
    // Persist middleware should have written both stores to localStorage.
    useUserDataStore.getState().addCharacter({ name: 'Second', type: 'player' });
    expect(localStorage.getItem('user_data_cache')).not.toBeNull();
    expect(localStorage.getItem('dnd_initiative_state')).not.toBeNull();

    const { qc, wrapper } = makeWrapper();
    const { result } = renderHook(() => useLogout(), { wrapper });
    await act(async () => {
      await result.current.mutateAsync();
    });

    expect(useUserDataStore.getState().characters).toEqual([]);
    expect(useUserDataStore.getState()._loaded).toBe(false);
    expect(useCombatStore.getState().cloudId).toBeNull();
    expect(useCombatStore.getState().cloudRev).toBe(0);
    expect(useCombatStore.getState().shareCode).toBeNull();
    expect(qc.getQueryData(['user-data'])).toBeUndefined();
    expect(qc.getQueryData(['encounters'])).toBeUndefined();
    expect(localStorage.getItem('user_data_cache')).toBeNull();
    expect(localStorage.getItem('dnd_initiative_state')).toBeNull();
  });
});

describe('useDeleteAccount — account isolation (f2)', () => {
  it('wipes the same client state as logout', async () => {
    seedUserAData();
    const { qc, wrapper } = makeWrapper();
    const { result } = renderHook(() => useDeleteAccount(), { wrapper });
    await act(async () => {
      await result.current.mutateAsync({ password: 'pw' });
    });

    expect(useUserDataStore.getState().characters).toEqual([]);
    expect(useCombatStore.getState().cloudId).toBeNull();
    expect(qc.getQueryData(['user-data'])).toBeUndefined();
  });
});

import { useEffect, useRef, useCallback } from 'react';
import * as Sentry from '@sentry/react';
import useUserDataStore from '../store/useUserDataStore';
import api from '../api/axiosInstance';

/**
 * Subscribes to useUserDataStore changes and auto-syncs to PUT /api/user-data
 * with a 2-second debounce. Handles 409 conflicts by accepting server state.
 */
export default function useUserDataSync(enabled) {
  const timerRef = useRef(null);
  const prevSnapshotRef = useRef(null);
  const syncedTimerRef = useRef(null);

  const sync = useCallback(async () => {
    const { characters, customMonsters, encounterPresets, version, _loaded } = useUserDataStore.getState();
    if (!_loaded) return;

    const snapshot = JSON.stringify({ characters, customMonsters, encounterPresets });
    if (snapshot === prevSnapshotRef.current) return;

    const previousSnapshot = prevSnapshotRef.current;
    prevSnapshotRef.current = snapshot;

    if (syncedTimerRef.current) clearTimeout(syncedTimerRef.current);
    useUserDataStore.setState({ syncStatus: 'syncing' });

    try {
      const { data } = await api.put('/user-data', {
        version,
        characters,
        customMonsters,
        encounterPresets,
      });
      useUserDataStore.setState({
        version: data.version,
        syncStatus: 'synced',
      });
      syncedTimerRef.current = setTimeout(() => {
        useUserDataStore.setState({ syncStatus: 'idle' });
      }, 3000);
    } catch (err) {
      if (err.response?.status === 409) {
        // Server wins — replace local state
        const serverData = err.response.data;
        useUserDataStore.getState().loadFromServer(serverData);
        prevSnapshotRef.current = JSON.stringify({
          characters: serverData.characters,
          customMonsters: serverData.customMonsters,
          encounterPresets: serverData.encounterPresets,
        });
        useUserDataStore.setState({ syncStatus: 'synced' });
        syncedTimerRef.current = setTimeout(() => {
          useUserDataStore.setState({ syncStatus: 'idle' });
        }, 3000);
      } else {
        prevSnapshotRef.current = previousSnapshot;
        useUserDataStore.setState({ syncStatus: 'error' });
        Sentry.captureException(err);
      }
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;

    // Track previous data references to skip sync when only syncStatus changes
    let prevCharacters = useUserDataStore.getState().characters;
    let prevCustomMonsters = useUserDataStore.getState().customMonsters;
    let prevPresets = useUserDataStore.getState().encounterPresets;

    const unsub = useUserDataStore.subscribe((state) => {
      // Only trigger sync when actual data changes, not syncStatus/_loaded
      if (
        state.characters === prevCharacters &&
        state.customMonsters === prevCustomMonsters &&
        state.encounterPresets === prevPresets
      ) return;

      prevCharacters = state.characters;
      prevCustomMonsters = state.customMonsters;
      prevPresets = state.encounterPresets;

      if (!state._loaded) return;

      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(sync, 2000);
    });

    return () => {
      unsub();
      if (timerRef.current) clearTimeout(timerRef.current);
      if (syncedTimerRef.current) clearTimeout(syncedTimerRef.current);
    };
  }, [enabled, sync]);
}

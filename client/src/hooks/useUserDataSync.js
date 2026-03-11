import { useEffect, useRef, useCallback } from 'react';
import useUserDataStore from '../store/useUserDataStore';
import axios from '../api/axiosInstance';

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
      const { data } = await axios.put('/user-data', {
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
        console.error('[useUserDataSync] Failed to sync:', err);
      }
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;

    // Subscribe with selector to only fire on data changes, not syncStatus
    const unsub = useUserDataStore.subscribe(
      (s) => [s.characters, s.customMonsters, s.encounterPresets],
      () => {
        const { _loaded } = useUserDataStore.getState();
        if (!_loaded) return;

        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(sync, 2000);
      },
      { equalityFn: (a, b) => a[0] === b[0] && a[1] === b[1] && a[2] === b[2] }
    );

    return () => {
      unsub();
      if (timerRef.current) clearTimeout(timerRef.current);
      if (syncedTimerRef.current) clearTimeout(syncedTimerRef.current);
    };
  }, [enabled, sync]);
}

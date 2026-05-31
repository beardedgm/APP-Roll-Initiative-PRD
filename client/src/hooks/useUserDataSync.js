import { useEffect, useRef, useCallback } from 'react';
import * as Sentry from '@sentry/react';
import useUserDataStore from '../store/useUserDataStore';
import api from '../api/axiosInstance';

/**
 * Subscribes to useUserDataStore changes and auto-syncs to PUT /api/user-data
 * with a 2-second debounce. Server merges by name (newest wins), returns the
 * merged result which we accept back into the local store.
 */
export default function useUserDataSync(enabled) {
  const timerRef = useRef(null);
  const prevSnapshotRef = useRef(null);
  const syncedTimerRef = useRef(null);

  const sync = useCallback(async (force = false) => {
    const { characters, customMonsters, encounterPresets, version, _loaded } = useUserDataStore.getState();
    if (!_loaded) return;

    const snapshot = JSON.stringify({ characters, customMonsters, encounterPresets });
    // Skip if nothing changed — unless forced (manual "sync now" click).
    if (!force && snapshot === prevSnapshotRef.current) return;

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

      // Server merges and returns the merged result — accept it back
      // Update snapshot to the merged state so we don't re-sync what the server just gave us
      prevSnapshotRef.current = JSON.stringify({
        characters: data.characters,
        customMonsters: data.customMonsters,
        encounterPresets: data.encounterPresets,
      });
      useUserDataStore.getState().loadFromServer(data);
      useUserDataStore.setState({ syncStatus: 'synced' });
      syncedTimerRef.current = setTimeout(() => {
        useUserDataStore.setState({ syncStatus: 'idle' });
      }, 3000);
    } catch (err) {
      prevSnapshotRef.current = previousSnapshot;
      useUserDataStore.setState({ syncStatus: 'error' });
      Sentry.captureException(err);
    }
  }, []);

  // Register a manual "sync now" trigger that force-pushes the current data.
  useEffect(() => {
    if (!enabled) return;
    useUserDataStore.getState().setTriggerSync(() => sync(true));
    return () => useUserDataStore.getState().setTriggerSync(null);
  }, [enabled, sync]);

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

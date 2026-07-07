import { useEffect, useRef, useCallback } from 'react';
import * as Sentry from '@sentry/react';
import useUserDataStore from '../store/useUserDataStore';
import api from '../api/axiosInstance';
import { isRetryableSyncError, syncBackoffDelay, MAX_SYNC_RETRIES } from '../utils/syncRetry';
import { buildUserDataPayload, payloadSnapshot } from '../utils/userDataPayload';

/**
 * Subscribes to useUserDataStore changes and auto-syncs to PUT /api/user-data
 * with a 2-second debounce. The payload includes live items plus pending
 * tombstones; the server merges per item (keyed on id/slug, higher rev wins)
 * and returns the live result, which we accept back into the local store.
 */
export default function useUserDataSync(enabled) {
  const timerRef = useRef(null);
  const prevSnapshotRef = useRef(null);
  const syncedTimerRef = useRef(null);
  const retryRef = useRef(0);
  const retryTimerRef = useRef(null);
  // Holds the latest `sync` so a scheduled retry can call it without referencing
  // `sync` inside its own definition (temporal-dead-zone / react-hooks rule).
  const syncRef = useRef(null);

  const sync = useCallback(async (force = false, isRetry = false) => {
    // A fresh (non-retry) sync resets the retry budget and cancels a pending one.
    if (!isRetry) retryRef.current = 0;
    if (retryTimerRef.current) { clearTimeout(retryTimerRef.current); retryTimerRef.current = null; }

    const st = useUserDataStore.getState();
    if (!st._loaded) return;

    // Payload = live items + pending tombstones (a tombstone is an item with deleted:true).
    const payload = buildUserDataPayload(st);

    // Dedup on the DATA, not `version` — the success handler stores the
    // server's live arrays here, and `version` changes on every write, so
    // including it would make the snapshot never match and re-sync forever.
    const snapshot = payloadSnapshot(payload);
    if (!force && snapshot === prevSnapshotRef.current) return;
    const previousSnapshot = prevSnapshotRef.current;
    prevSnapshotRef.current = snapshot;

    if (syncedTimerRef.current) clearTimeout(syncedTimerRef.current);
    useUserDataStore.setState({ syncStatus: 'syncing' });

    try {
      const { data } = await api.put('/user-data', payload);
      retryRef.current = 0;

      // The server rejected some items as invalid (f7). Don't clobber the local
      // store with the server view (which omits them) — keep the local copy so
      // the user can fix it, and surface an error instead of losing it silently.
      if (data.dropped && data.dropped.length) {
        useUserDataStore.setState({ syncStatus: 'error' });
        Sentry.captureMessage('user-data sync dropped invalid items', {
          level: 'warning',
          extra: { dropped: data.dropped },
        });
        return;
      }

      // If the store changed while the PUT was in flight, the server view
      // reflects the PRE-edit payload — adopting it would clobber the in-flight
      // edit (f3). Don't. Re-sync instead; the server rev-merge reconciles the
      // delta, and tombstones stay pending until a clean (no in-flight) success.
      const afterSnapshot = payloadSnapshot(buildUserDataPayload(useUserDataStore.getState()));
      if (afterSnapshot !== snapshot) {
        prevSnapshotRef.current = snapshot; // we pushed `snapshot`; server merged it
        useUserDataStore.setState({ syncStatus: 'syncing' });
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => syncRef.current?.(true), 0);
        return;
      }

      prevSnapshotRef.current = JSON.stringify({
        characters: data.characters,
        customMonsters: data.customMonsters,
        encounterPresets: data.encounterPresets,
      });
      useUserDataStore.getState().loadFromServer(data);
      // Server has stored our tombstones (it defends them against stale
      // re-adds via rev) — safe to clear the local pending set now.
      useUserDataStore.getState().clearPendingDeletions();
      useUserDataStore.setState({ syncStatus: 'synced' });
      syncedTimerRef.current = setTimeout(() => {
        useUserDataStore.setState({ syncStatus: 'idle' });
      }, 3000);
    } catch (err) {
      prevSnapshotRef.current = previousSnapshot;
      useUserDataStore.setState({ syncStatus: 'error' });
      Sentry.captureException(err);

      // Retry transient failures (network/5xx/429) with backoff; leave permanent
      // 4xx alone (a re-send can't fix it) — the next real edit will try again.
      if (isRetryableSyncError(err) && retryRef.current < MAX_SYNC_RETRIES) {
        const delay = syncBackoffDelay(retryRef.current);
        retryRef.current += 1;
        retryTimerRef.current = setTimeout(() => syncRef.current?.(true, true), delay);
      }
    }
  }, []);

  // Keep the retry ref pointing at the current sync.
  useEffect(() => {
    syncRef.current = sync;
  }, [sync]);

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
    let prevDelChars = useUserDataStore.getState().deletedCharacters;
    let prevDelMons = useUserDataStore.getState().deletedCustomMonsters;
    let prevDelPresets = useUserDataStore.getState().deletedEncounterPresets;

    const unsub = useUserDataStore.subscribe((state) => {
      // Only trigger sync when actual data changes, not syncStatus/_loaded
      if (
        state.characters === prevCharacters &&
        state.customMonsters === prevCustomMonsters &&
        state.encounterPresets === prevPresets &&
        state.deletedCharacters === prevDelChars &&
        state.deletedCustomMonsters === prevDelMons &&
        state.deletedEncounterPresets === prevDelPresets
      ) return;

      prevCharacters = state.characters;
      prevCustomMonsters = state.customMonsters;
      prevPresets = state.encounterPresets;
      prevDelChars = state.deletedCharacters;
      prevDelMons = state.deletedCustomMonsters;
      prevDelPresets = state.deletedEncounterPresets;

      if (!state._loaded) return;

      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(sync, 2000);
    });

    // Flush a pending debounced sync when the tab is hidden or closing, so an
    // edit made within the 2s debounce window isn't lost on tab close (f4).
    // visibilitychange→hidden is the reliable path (page usually stays alive to
    // finish the request); pagehide is the best-effort backstop on real unload.
    const flush = () => {
      if (!timerRef.current) return;
      clearTimeout(timerRef.current);
      timerRef.current = null;
      syncRef.current?.(true);
    };
    const onVisibility = () => { if (document.visibilityState === 'hidden') flush(); };
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pagehide', flush);

    return () => {
      unsub();
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pagehide', flush);
      if (timerRef.current) clearTimeout(timerRef.current);
      if (syncedTimerRef.current) clearTimeout(syncedTimerRef.current);
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
    };
  }, [enabled, sync]);
}

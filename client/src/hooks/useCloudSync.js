import { useEffect, useRef, useCallback } from 'react';
import { create } from 'zustand';
import * as Sentry from '@sentry/react';
import useCombatStore from '../store/useCombatStore';
import { useUpdateEncounter } from '../api/useEncounters';

/**
 * Tiny store for cloud sync status.
 * States: 'idle' | 'syncing' | 'synced' | 'error'
 */
export const useSyncStatus = create((set) => ({
  syncStatus: 'idle',
  setSyncStatus: (syncStatus) => set({ syncStatus }),
  // Manual "sync now" trigger registered by useCloudSync; null when no tracker
  // with cloud sync is mounted. SyncIndicator calls it on click.
  triggerSync: null,
  setTriggerSync: (triggerSync) => set({ triggerSync }),
}));

/**
 * Auto-syncs the Zustand combat store to the server when the encounter
 * has a cloudId (i.e. has been saved to the cloud). Debounces at 500ms.
 */
export default function useCloudSync(enabled) {
  const updateEncounter = useUpdateEncounter();
  const timerRef = useRef(null);
  const prevSnapshotRef = useRef(null);
  const syncedTimerRef = useRef(null);
  const retryTimerRef = useRef(null);
  // Holds the latest sync() so the retry timer can call it without sync
  // depending on itself (which would be a circular useCallback dep).
  const syncRef = useRef(null);
  const setSyncStatus = useSyncStatus(s => s.setSyncStatus);
  const setTriggerSync = useSyncStatus(s => s.setTriggerSync);

  const sync = useCallback(async (force = false) => {
    const { cloudId, name, state, currentRound, activeCreatureId, combatants, diceHistory } = useCombatStore.getState();
    if (!cloudId) return;

    const snapshot = JSON.stringify({ name, state, currentRound, activeCreatureId, combatants, diceHistory });

    // Skip if nothing changed — unless forced (manual "sync now" click).
    if (!force && snapshot === prevSnapshotRef.current) return;
    const previousSnapshot = prevSnapshotRef.current;
    prevSnapshotRef.current = snapshot;

    // Clear any pending "synced" auto-clear timer and any scheduled retry
    if (syncedTimerRef.current) clearTimeout(syncedTimerRef.current);
    if (retryTimerRef.current) clearTimeout(retryTimerRef.current);

    setSyncStatus('syncing');

    try {
      await updateEncounter.mutateAsync({
        id: cloudId,
        name,
        state,
        currentRound,
        activeCreatureId,
        combatants,
        diceHistory,
      });
      setSyncStatus('synced');
      // Auto-clear back to idle after 3 seconds
      syncedTimerRef.current = setTimeout(() => setSyncStatus('idle'), 3000);
    } catch (err) {
      // Reset so the next sync attempt re-detects the change and retries.
      prevSnapshotRef.current = previousSnapshot;
      setSyncStatus('error');
      Sentry.captureException(err);
      // Schedule an automatic retry. Without this, a failed sync that happens
      // to be the LAST change of a session would never be persisted (the store
      // only re-triggers sync on a new edit), silently dropping cloud data.
      // The retry re-reads the latest store state, so it also captures any
      // edits made while the failed request was in flight.
      retryTimerRef.current = setTimeout(() => { syncRef.current?.(); }, 3000);
    }
  }, [updateEncounter, setSyncStatus]);

  // Keep syncRef pointed at the latest sync() for the retry timer.
  useEffect(() => { syncRef.current = sync; });

  // Register a manual "sync now" trigger that force-pushes the current state.
  useEffect(() => {
    if (!enabled) return;
    setTriggerSync(() => syncRef.current?.(true));
    return () => setTriggerSync(null);
  }, [enabled, setTriggerSync]);

  useEffect(() => {
    if (!enabled) return;

    const unsub = useCombatStore.subscribe(() => {
      const { cloudId } = useCombatStore.getState();
      if (!cloudId) return;

      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(sync, 500);
    });

    return () => {
      unsub();
      if (timerRef.current) clearTimeout(timerRef.current);
      if (syncedTimerRef.current) clearTimeout(syncedTimerRef.current);
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
    };
  }, [enabled, sync]);
}

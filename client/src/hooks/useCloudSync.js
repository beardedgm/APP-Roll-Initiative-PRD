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
  const setSyncStatus = useSyncStatus(s => s.setSyncStatus);

  const sync = useCallback(async () => {
    const { cloudId, name, state, currentRound, activeCreatureId, combatants, diceHistory } = useCombatStore.getState();
    if (!cloudId) return;

    const snapshot = JSON.stringify({ name, state, currentRound, activeCreatureId, combatants, diceHistory });

    // Skip if nothing changed
    if (snapshot === prevSnapshotRef.current) return;
    const previousSnapshot = prevSnapshotRef.current;
    prevSnapshotRef.current = snapshot;

    // Clear any pending "synced" auto-clear timer
    if (syncedTimerRef.current) clearTimeout(syncedTimerRef.current);

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
      // Reset so the next sync attempt will retry
      prevSnapshotRef.current = previousSnapshot;
      setSyncStatus('error');
      Sentry.captureException(err);
    }
  }, [updateEncounter, setSyncStatus]);

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
    };
  }, [enabled, sync]);
}

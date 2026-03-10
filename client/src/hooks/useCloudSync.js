import { useEffect, useRef, useCallback } from 'react';
import useCombatStore from '../store/useCombatStore';
import { useUpdateEncounter } from '../api/useEncounters';

/**
 * Auto-syncs the Zustand combat store to the server when the encounter
 * has a cloudId (i.e. has been saved to the cloud). Debounces at 500ms.
 */
export default function useCloudSync(enabled) {
  const updateEncounter = useUpdateEncounter();
  const timerRef = useRef(null);
  const prevSnapshotRef = useRef(null);

  const sync = useCallback(async () => {
    const { cloudId, name, state, currentRound, activeCreatureId, combatants, diceHistory } = useCombatStore.getState();
    if (!cloudId) return;

    const snapshot = JSON.stringify({ name, state, currentRound, activeCreatureId, combatants, diceHistory });

    // Skip if nothing changed
    if (snapshot === prevSnapshotRef.current) return;
    const previousSnapshot = prevSnapshotRef.current;
    prevSnapshotRef.current = snapshot;

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
    } catch (err) {
      // Reset so the next sync attempt will retry
      prevSnapshotRef.current = previousSnapshot;
      console.error('[useCloudSync] Failed to sync encounter:', err);
    }
  }, [updateEncounter]);

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
    };
  }, [enabled, sync]);
}

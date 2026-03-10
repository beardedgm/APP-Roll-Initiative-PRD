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

  const sync = useCallback(() => {
    const { cloudId, name, state, currentRound, activeCreatureId, combatants, diceHistory } = useCombatStore.getState();
    if (!cloudId) return;

    const snapshot = JSON.stringify({ name, state, currentRound, activeCreatureId, combatants, diceHistory });

    // Skip if nothing changed
    if (snapshot === prevSnapshotRef.current) return;
    prevSnapshotRef.current = snapshot;

    updateEncounter.mutate({
      id: cloudId,
      name,
      state,
      currentRound,
      activeCreatureId,
      combatants,
      diceHistory,
    });
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

import { useEffect, useRef } from 'react';
import useCombatStore from '../store/useCombatStore';
import { useEncounters, useEncounter, useCreateEncounter } from '../api/useEncounters';
import useCloudSync from './useCloudSync';

/**
 * Orchestrates the cloud encounter lifecycle for logged-in subscribers.
 *
 * - If cloudId exists in the store (returning user, same device): enables useCloudSync.
 * - If no cloudId and server has encounters: loads the most recent one into the store.
 * - If no cloudId and server has no encounters: creates a new cloud encounter from local state.
 * - Free users (no subscription, no owner role): tracker works locally, no cloud sync.
 */
export default function useEncounterCloudSetup(user) {
  const cloudId = useCombatStore(s => s.cloudId);
  const setCloudId = useCombatStore(s => s.setCloudId);
  const loadSnapshot = useCombatStore(s => s.loadSnapshot);
  const createEncounter = useCreateEncounter();
  const createRef = useRef(createEncounter);
  const didSetupRef = useRef(false);
  const isCreatingRef = useRef(false);

  const isSubscriber = !!user && (user.role === 'owner' || user.subscriptionStatus === 'active');
  const needsSetup = isSubscriber && !cloudId;

  // Only fetch encounter list when we need to set up (no cloudId)
  const { data: encounters, isLoading: listLoading } = useEncounters({ enabled: needsSetup });

  // If server has encounters, fetch the most recent one
  const mostRecentId = needsSetup && encounters?.length > 0 ? encounters[0]._id : null;
  const { data: mostRecentEncounter, isLoading: encounterLoading } = useEncounter(mostRecentId);

  // Enable cloud sync when we have a cloudId
  useCloudSync(isSubscriber && !!cloudId);

  // Keep createRef in sync with latest mutation object
  useEffect(() => { createRef.current = createEncounter; });

  // Reset setup flag when cloudId clears (e.g., resetEncounter)
  useEffect(() => {
    if (!cloudId) {
      didSetupRef.current = false;
      isCreatingRef.current = false;
    }
  }, [cloudId]);

  // Main setup effect
  useEffect(() => {
    if (!needsSetup || didSetupRef.current || listLoading) return;

    // Case: server has encounters → load the most recent one
    if (encounters && encounters.length > 0) {
      if (encounterLoading || !mostRecentEncounter) return;

      didSetupRef.current = true;
      loadSnapshot({
        name: mostRecentEncounter.name,
        state: mostRecentEncounter.state,
        currentRound: mostRecentEncounter.currentRound,
        activeCreatureId: mostRecentEncounter.activeCreatureId,
        combatants: mostRecentEncounter.combatants || [],
        diceHistory: mostRecentEncounter.diceHistory || [],
      });
      setCloudId(mostRecentEncounter._id);
      useCombatStore.getState().setCloudRev(mostRecentEncounter.rev || 0);
      return;
    }

    // Case: server has no encounters → create one from current local state
    if (encounters && encounters.length === 0 && !isCreatingRef.current) {
      isCreatingRef.current = true;
      didSetupRef.current = true;

      const { name, state, currentRound, activeCreatureId, combatants, diceHistory } =
        useCombatStore.getState();

      createRef.current.mutate(
        { name, state, currentRound, activeCreatureId, combatants, diceHistory },
        {
          onSuccess: (encounter) => {
            setCloudId(encounter._id);
            useCombatStore.getState().setCloudRev(encounter.rev || 0);
          },
          onError: () => {
            didSetupRef.current = false;
            isCreatingRef.current = false;
          },
        }
      );
    }
  }, [needsSetup, listLoading, encounters, encounterLoading, mostRecentEncounter, loadSnapshot, setCloudId]);
}

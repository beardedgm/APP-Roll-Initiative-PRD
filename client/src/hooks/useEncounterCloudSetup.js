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
 * - If the user just deliberately reset (cloudId went truthy→null): creates a FRESH
 *   encounter instead of auto-reloading the stale one they just cleared.
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
  // True when cloudId went from set → null this session (a deliberate reset),
  // so the setup effect creates a fresh encounter rather than reloading the
  // stale one the user just cleared.
  const justResetRef = useRef(false);
  const prevCloudIdRef = useRef(cloudId);

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

  // Detect a deliberate reset (had a cloudId, now cleared) vs a fresh login
  // (never had one). Only the former should bypass the "load most recent" path.
  useEffect(() => {
    if (prevCloudIdRef.current && !cloudId) {
      justResetRef.current = true;
      didSetupRef.current = false;
      isCreatingRef.current = false;
    }
    prevCloudIdRef.current = cloudId;
  }, [cloudId]);

  // Main setup effect
  useEffect(() => {
    if (!needsSetup || didSetupRef.current || listLoading) return;
    if (!encounters) return; // list not loaded yet

    // Case: server has encounters → load the most recent one,
    // UNLESS the user just deliberately reset (then fall through to create).
    if (encounters.length > 0 && !justResetRef.current) {
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

    // Case: no encounters OR just reset → create a fresh cloud encounter
    if (!isCreatingRef.current) {
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
            justResetRef.current = false;
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

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
 *
 * Note: resetEncounter() reuses the current cloud encounter (it preserves
 * cloudId), so a reset no longer clears cloudId or creates a new doc — there is
 * no "deliberate reset" special case to handle here.
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

  // Reset setup flags when cloudId clears (e.g., logout/clearAll) so setup can re-run.
  useEffect(() => {
    if (!cloudId) {
      didSetupRef.current = false;
      isCreatingRef.current = false;
    }
  }, [cloudId]);

  // Main setup effect
  useEffect(() => {
    if (!needsSetup || didSetupRef.current || listLoading) return;
    if (!encounters) return; // list not loaded yet

    // Case: server has encounters → load the most recent one
    if (encounters.length > 0) {
      if (encounterLoading || !mostRecentEncounter) return;

      didSetupRef.current = true;
      // loadSnapshot spreads over current state, so omitted keys KEEP their
      // stale values. Share state must come from the server here — otherwise
      // the store can retain a shareCode belonging to a different (or
      // deleted) encounter, and ShareLinkModal shows/revokes the wrong link.
      // (Preset loads in EncounterLibrary/Dashboard intentionally do NOT set
      // these: presets load into the SAME cloud encounter, whose live share
      // link legitimately survives.)
      loadSnapshot({
        name: mostRecentEncounter.name,
        state: mostRecentEncounter.state,
        currentRound: mostRecentEncounter.currentRound,
        activeCreatureId: mostRecentEncounter.activeCreatureId,
        combatants: mostRecentEncounter.combatants || [],
        diceHistory: mostRecentEncounter.diceHistory || [],
        shareCode: mostRecentEncounter.shareCode || null,
        latestSharedRoll: mostRecentEncounter.latestSharedRoll || null,
        // Local-only broadcast toggle (not server-persisted) — never carry it
        // across encounters: a leftover `true` would broadcast rolls to an
        // old encounter's viewers.
        showRollsToPlayers: false,
      });
      setCloudId(mostRecentEncounter._id);
      useCombatStore.getState().setCloudRev(mostRecentEncounter.rev || 0);
      return;
    }

    // Case: server has no encounters → create one from current local state
    if (encounters.length === 0 && !isCreatingRef.current) {
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

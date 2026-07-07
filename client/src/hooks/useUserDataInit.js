import { useEffect } from 'react';
import { useUserData } from '../api/useUserData';
import useUserDataStore from '../store/useUserDataStore';
import useUserDataSync from './useUserDataSync';
import api from '../api/axiosInstance';
import { buildUserDataPayload } from '../utils/userDataPayload';

/**
 * Initializes user data from the server and enables auto-sync.
 * If server has data, it becomes the source of truth.
 * If server is empty but local has data, keeps local and lets sync push it up.
 *
 * Use in any page that needs user data (Tracker, Dashboard).
 */
export default function useUserDataInit(isAuthenticated) {
  const { data: serverData } = useUserData(isAuthenticated);
  const loadFromServer = useUserDataStore(s => s.loadFromServer);
  const dataLoaded = useUserDataStore(s => s._loaded);

  useEffect(() => {
    if (!serverData || dataLoaded) return;

    const serverHasData = (serverData.characters?.length > 0)
      || (serverData.customMonsters?.length > 0)
      || (serverData.encounterPresets?.length > 0);

    const local = useUserDataStore.getState();
    const localHasData = (local.characters.length > 0)
      || (local.customMonsters.length > 0)
      || (local.encounterPresets.length > 0)
      || (local.deletedCharacters.length > 0)
      || (local.deletedCustomMonsters.length > 0)
      || (local.deletedEncounterPresets.length > 0);

    if (serverHasData && localHasData) {
      // Both sides have data — DON'T overwrite local (f4). Reconcile via the
      // server's rev-merge: mark loaded, push local (live + tombstones), then
      // adopt the merged result. On failure keep local; the sync hook retries.
      useUserDataStore.setState({ _loaded: true, version: serverData.version || 0 });
      api.put('/user-data', buildUserDataPayload(useUserDataStore.getState()))
        .then(({ data }) => {
          if (data.dropped?.length) return; // keep local; the sync hook surfaces it
          useUserDataStore.getState().loadFromServer(data);
          useUserDataStore.getState().clearPendingDeletions();
        })
        .catch(() => { /* keep local; the sync hook retries on the next edit */ });
    } else if (serverHasData) {
      // Only the server has data — adopt it wholesale (nothing local to lose).
      loadFromServer(serverData);
    } else if (localHasData) {
      // Only local has data — keep it and mark loaded so sync pushes it up.
      useUserDataStore.setState({ _loaded: true, version: serverData.version || 0 });
    } else {
      // Both empty — just mark as loaded.
      loadFromServer(serverData);
    }
  }, [serverData, dataLoaded, loadFromServer]);

  // Enable auto-sync when authenticated
  useUserDataSync(isAuthenticated);
}

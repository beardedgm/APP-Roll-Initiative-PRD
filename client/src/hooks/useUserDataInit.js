import { useEffect } from 'react';
import { useUserData } from '../api/useUserData';
import useUserDataStore from '../store/useUserDataStore';
import useUserDataSync from './useUserDataSync';

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

    if (serverHasData) {
      loadFromServer(serverData);
    } else {
      // Server is empty — check if local store has data worth preserving
      const local = useUserDataStore.getState();
      const localHasData = (local.characters?.length > 0)
        || (local.customMonsters?.length > 0)
        || (local.encounterPresets?.length > 0);

      if (localHasData) {
        // Keep local data, just mark as loaded so sync hook can push it to server
        useUserDataStore.setState({
          _loaded: true,
          version: serverData.version || 0,
        });
      } else {
        // Both empty — just mark as loaded
        loadFromServer(serverData);
      }
    }
  }, [serverData, dataLoaded, loadFromServer]);

  // Enable auto-sync when authenticated
  useUserDataSync(isAuthenticated);
}

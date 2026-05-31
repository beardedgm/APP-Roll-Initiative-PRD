import { Save } from 'lucide-react';
import useUserDataStore from '../../store/useUserDataStore';
import { useSyncStatus } from '../../hooks/useCloudSync';

/**
 * Sync status icon + manual "sync now" button. Shows the worst-case status
 * between user data sync and encounter cloud sync, and clicking force-pushes
 * both immediately (useful to retry after an error). Auto-sync still runs.
 *
 * Green = saved, Grey = saving/pending, Red = error
 */
export default function SyncIndicator() {
  const userDataStatus = useUserDataStore(s => s.syncStatus);
  const encounterStatus = useSyncStatus(s => s.syncStatus);
  const userDataTrigger = useUserDataStore(s => s.triggerSync);
  const encounterTrigger = useSyncStatus(s => s.triggerSync);

  // Derive combined status: error > syncing > synced/idle
  let status = 'synced';
  if (userDataStatus === 'error' || encounterStatus === 'error') {
    status = 'error';
  } else if (userDataStatus === 'syncing' || encounterStatus === 'syncing') {
    status = 'syncing';
  } else if (userDataStatus === 'synced' || encounterStatus === 'synced') {
    status = 'synced';
  }
  // idle + idle = synced (both at rest)

  const syncing = status === 'syncing';

  const tooltip = syncing ? 'Saving…'
    : status === 'error' ? 'Sync failed — click to retry'
    : 'Saved — click to sync now';

  const handleClick = () => {
    if (syncing) return;
    userDataTrigger?.();
    encounterTrigger?.();
  };

  return (
    <button
      type="button"
      className={`sync-icon sync-icon--${status}`}
      title={tooltip}
      aria-label={tooltip}
      onClick={handleClick}
      disabled={syncing}
    >
      <Save size={16} />
    </button>
  );
}

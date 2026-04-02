import { Save } from 'lucide-react';
import useUserDataStore from '../../store/useUserDataStore';
import { useSyncStatus } from '../../hooks/useCloudSync';

/**
 * Visual sync status icon. Shows the worst-case status between
 * user data sync and encounter cloud sync.
 *
 * Green = saved, Grey = saving/pending, Red = error
 */
export default function SyncIndicator() {
  const userDataStatus = useUserDataStore(s => s.syncStatus);
  const encounterStatus = useSyncStatus(s => s.syncStatus);

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

  const tooltip = status === 'syncing' ? 'Saving...'
    : status === 'error' ? 'Sync error'
    : 'Saved';

  return (
    <span className={`sync-icon sync-icon--${status}`} title={tooltip}>
      <Save size={16} />
    </span>
  );
}

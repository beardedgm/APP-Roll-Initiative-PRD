import { useRef, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useShallow } from 'zustand/react/shallow';
import useCombatStore from '../../store/useCombatStore';
import { exportEncounterJSON, importEncounterJSON } from '../../utils/encounterSaves';
import { useCurrentUser } from '../../api/useAuth';
import { useCreateEncounter, useShareEncounter, useUnshareEncounter } from '../../api/useEncounters';
import { useSyncStatus } from '../../hooks/useCloudSync';

export default function TrackerHeader() {
  const {
    name, undoLen, redoLen, cloudId, shareCode,
    undo, redo, renameEncounter, resetEncounter, setCloudId, setShareCode,
  } = useCombatStore(useShallow(s => ({
    name: s.name,
    undoLen: s.undoStack.length,
    redoLen: s.redoStack.length,
    cloudId: s.cloudId,
    shareCode: s.shareCode,
    undo: s.undo,
    redo: s.redo,
    renameEncounter: s.renameEncounter,
    resetEncounter: s.resetEncounter,
    setCloudId: s.setCloudId,
    setShareCode: s.setShareCode,
  })));
  const importRef = useRef(null);

  const { data: user } = useCurrentUser();
  const createEncounter = useCreateEncounter();
  const shareEncounter = useShareEncounter();
  const unshareEncounter = useUnshareEncounter();
  const [copied, setCopied] = useState(false);
  const syncStatus = useSyncStatus(s => s.syncStatus);

  const isPremium = user && (user.subscriptionStatus === 'active' || user.role === 'admin');

  function handleRename() {
    const newName = window.prompt('Rename encounter:', name || 'New Encounter');
    if (newName === null) return;
    const trimmed = newName.trim();
    if (trimmed) renameEncounter(trimmed);
  }

  function handleExport() {
    const { id, name, state, currentRound, activeCreatureId, combatants, diceHistory } = useCombatStore.getState();
    exportEncounterJSON({ id, name, state, currentRound, activeCreatureId, combatants, diceHistory });
  }

  function handleImport(e) {
    const file = e.target.files[0];
    if (!file) return;
    importEncounterJSON(file)
      .then(imported => {
        if (!window.confirm(`Import "${imported.name || 'encounter'}"? This replaces the current encounter.`)) return;
        useCombatStore.getState().loadSnapshot(imported);
      })
      .catch(err => window.alert(`Import failed: ${err.message}`));
    e.target.value = '';
  }

  function handleReset() {
    if (!window.confirm('Reset encounter? Monsters and NPCs will be removed. Players are kept.')) return;
    resetEncounter();
  }

  const handleCloudSave = useCallback(async () => {
    const store = useCombatStore.getState();
    if (store.cloudId) return; // Already saved — auto-sync handles updates
    try {
      const encounter = await createEncounter.mutateAsync({
        name: store.name,
        state: store.state,
        currentRound: store.currentRound,
        activeCreatureId: store.activeCreatureId,
        combatants: store.combatants,
        diceHistory: store.diceHistory,
      });
      setCloudId(encounter._id);
    } catch {
      window.alert('Cloud save failed. Please try again.');
    }
  }, [createEncounter, setCloudId]);

  const handleToggleShare = useCallback(async () => {
    if (!cloudId) return;
    try {
      if (shareCode) {
        await unshareEncounter.mutateAsync(cloudId);
        setShareCode(null);
      } else {
        const result = await shareEncounter.mutateAsync(cloudId);
        setShareCode(result.shareCode);
        const url = `${window.location.origin}/play/${result.shareCode}`;
        try {
          await navigator.clipboard.writeText(url);
        } catch {
          // clipboard not available — silent fail
        }
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch {
      window.alert('Share toggle failed. Please try again.');
    }
  }, [cloudId, shareCode, shareEncounter, unshareEncounter, setShareCode]);

  async function handleOpenPlayerView() {
    if (shareCode) {
      const url = `${window.location.origin}/play/${shareCode}`;
      try {
        await navigator.clipboard.writeText(url);
      } catch {
        // clipboard not available — silent fail
      }
      window.open(`/play/${shareCode}`, 'playerView', 'width=1280,height=720,menubar=no,toolbar=no,location=no,status=no');
    } else {
      window.open('/play', 'playerView', 'width=1280,height=720,menubar=no,toolbar=no,location=no,status=no');
    }
  }

  return (
    <header className="dm-header">
      <div className="dm-header__left">
        <h1>&#9876; Initiative Tracker</h1>
        <span className="dm-header__subtitle">Dungeon Master View</span>
      </div>

      <div className="dm-header__center">
        <span className="encounter-name" title="Click to rename" onClick={handleRename}>
          {name || 'New Encounter'}
        </span>
      </div>

      <div className="dm-header__right">
        {/* History */}
        <button className="btn btn--icon" disabled={undoLen === 0} onClick={undo} title="Undo (Ctrl+Z)">
          &#8617; Undo
        </button>
        <button className="btn btn--icon" disabled={redoLen === 0} onClick={redo} title="Redo (Ctrl+Y)">
          &#8618; Redo
        </button>

        <span className="header-divider" />

        {/* Encounter management */}
        {isPremium && (
          <>
            {cloudId ? (
              <>
                <span className="sync-indicator" title={
                  syncStatus === 'syncing' ? 'Saving changes...' :
                  syncStatus === 'synced' ? 'All changes saved' :
                  syncStatus === 'error' ? 'Sync failed — will retry on next change' :
                  'Auto-syncing to cloud'
                }>
                  {syncStatus === 'syncing' && <span className="sync-indicator__syncing">&#9729; Saving...</span>}
                  {syncStatus === 'synced' && <span className="sync-indicator__saved">&#10003; Saved</span>}
                  {syncStatus === 'error' && <span className="sync-indicator__error">&#9888; Sync failed</span>}
                  {syncStatus === 'idle' && <span className="sync-indicator__idle">&#9729; Cloud</span>}
                </span>
                <button className="btn btn--icon" onClick={handleToggleShare} title={shareCode ? 'Remove share link' : 'Generate share link'}>
                  {shareCode ? (copied ? '&#10003; Copied!' : '&#128279; Unshare') : '&#128279; Share'}
                </button>
              </>
            ) : (
              <button className="btn btn--icon" onClick={handleCloudSave} disabled={createEncounter.isPending} title="Save to cloud">
                &#9729; {createEncounter.isPending ? 'Saving...' : 'Save'}
              </button>
            )}
            <Link to="/dashboard" className="btn btn--icon" title="Saved encounters">&#128194; Dashboard</Link>
            <span className="header-divider" />
          </>
        )}

        <button className="btn btn--icon" onClick={handleExport} title="Export as JSON">&#8593; Export</button>
        <label className="btn btn--icon" htmlFor="input-import" title="Import from JSON" style={{ cursor: 'pointer' }}>
          &#8595; Import
        </label>
        <input
          ref={importRef}
          type="file"
          id="input-import"
          accept=".json,application/json"
          className="hidden"
          onChange={handleImport}
        />

        <span className="header-divider" />

        {/* Combat */}
        <button className="btn btn--secondary" onClick={handleOpenPlayerView} title={shareCode ? 'Open shared player view' : 'Open local player view'}>
          &#128498; Player View
        </button>
        <button className="btn btn--danger" onClick={handleReset} title="Reset the entire encounter">
          &#128465; Reset
        </button>
      </div>
    </header>
  );
}

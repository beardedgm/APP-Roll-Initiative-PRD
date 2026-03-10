import { useRef, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useShallow } from 'zustand/react/shallow';
import useCombatStore from '../../store/useCombatStore';
import { saveNamedEncounter } from '../../utils/encounterSaves';
import { exportEncounterJSON, importEncounterJSON } from '../../utils/encounterSaves';
import useUIStore from '../../store/useUIStore';
import { useCurrentUser } from '../../api/useAuth';
import { useCreateEncounter, useShareEncounter, useUnshareEncounter } from '../../api/useEncounters';

export default function TrackerHeader() {
  const {
    name, undoStack, redoStack, cloudId, shareCode,
    undo, redo, renameEncounter, resetEncounter, setCloudId, setShareCode,
  } = useCombatStore(useShallow(s => ({
    name: s.name,
    undoStack: s.undoStack,
    redoStack: s.redoStack,
    cloudId: s.cloudId,
    shareCode: s.shareCode,
    undo: s.undo,
    redo: s.redo,
    renameEncounter: s.renameEncounter,
    resetEncounter: s.resetEncounter,
    setCloudId: s.setCloudId,
    setShareCode: s.setShareCode,
  })));
  const openModal = useUIStore(s => s.openModal);
  const importRef = useRef(null);

  const { data: user } = useCurrentUser();
  const createEncounter = useCreateEncounter();
  const shareEncounter = useShareEncounter();
  const unshareEncounter = useUnshareEncounter();
  const [copied, setCopied] = useState(false);

  const isPremium = user && (user.subscriptionStatus === 'active' || user.role === 'admin');

  function handleRename() {
    const newName = window.prompt('Rename encounter:', name || 'New Encounter');
    if (newName === null) return;
    const trimmed = newName.trim();
    if (trimmed) renameEncounter(trimmed);
  }

  function handleSave() {
    const store = useCombatStore.getState();
    const saveName = window.prompt('Save encounter as:', store.name || 'New Encounter');
    if (saveName === null) return;
    const trimmed = saveName.trim();
    if (!trimmed) return;

    store.renameEncounter(trimmed);
    const { id, state, currentRound, activeCreatureId, combatants, diceHistory } = useCombatStore.getState();
    saveNamedEncounter({
      id,
      name: trimmed,
      savedAt: new Date().toISOString(),
      snapshot: { id, name: trimmed, state, currentRound, activeCreatureId, combatants, diceHistory },
    });
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
    if (shareCode) {
      await unshareEncounter.mutateAsync(cloudId);
      setShareCode(null);
    } else {
      const result = await shareEncounter.mutateAsync(cloudId);
      setShareCode(result.shareCode);
      const url = `${window.location.origin}/play/${result.shareCode}`;
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [cloudId, shareCode, shareEncounter, unshareEncounter, setShareCode]);

  function handleOpenPlayerView() {
    if (shareCode) {
      const url = `${window.location.origin}/play/${shareCode}`;
      navigator.clipboard.writeText(url);
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
        <button className="btn btn--icon" disabled={undoStack.length === 0} onClick={undo} title="Undo (Ctrl+Z)">
          &#8617; Undo
        </button>
        <button className="btn btn--icon" disabled={redoStack.length === 0} onClick={redo} title="Redo (Ctrl+Y)">
          &#8618; Redo
        </button>

        <span className="header-divider" />

        <button className="btn btn--icon" onClick={handleSave} title="Save encounter">&#128190; Save</button>
        <button className="btn btn--icon" onClick={() => openModal('saved-encounters')} title="Load a saved encounter">
          &#128194; Load
        </button>

        <span className="header-divider" />

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

        {isPremium && (
          <>
            <span className="header-divider" />
            {cloudId ? (
              <>
                <span className="btn btn--icon cloud-synced" title="Auto-syncing to cloud">&#9729; Synced</span>
                <button className="btn btn--icon" onClick={handleToggleShare} title={shareCode ? 'Remove share link' : 'Generate share link'}>
                  {shareCode ? (copied ? '&#10003; Copied!' : '&#128279; Unshare') : '&#128279; Share'}
                </button>
              </>
            ) : (
              <button className="btn btn--icon" onClick={handleCloudSave} disabled={createEncounter.isPending} title="Save to cloud">
                &#9729; {createEncounter.isPending ? 'Saving...' : 'Cloud Save'}
              </button>
            )}
            <Link to="/dashboard" className="btn btn--icon" title="Saved encounters">&#128194; Dashboard</Link>
          </>
        )}

        <span className="header-divider" />

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

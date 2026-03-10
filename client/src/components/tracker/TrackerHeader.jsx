import { useRef } from 'react';
import useCombatStore from '../../store/useCombatStore';
import { saveNamedEncounter } from '../../utils/encounterSaves';
import { exportEncounterJSON, importEncounterJSON } from '../../utils/encounterSaves';
import useUIStore from '../../store/useUIStore';

export default function TrackerHeader() {
  const name = useCombatStore(s => s.name);
  const undoStack = useCombatStore(s => s.undoStack);
  const redoStack = useCombatStore(s => s.redoStack);
  const undo = useCombatStore(s => s.undo);
  const redo = useCombatStore(s => s.redo);
  const renameEncounter = useCombatStore(s => s.renameEncounter);
  const resetEncounter = useCombatStore(s => s.resetEncounter);
  const openModal = useUIStore(s => s.openModal);
  const importRef = useRef(null);

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
    const { id, name: n, state, currentRound, activeCreatureId, combatants, diceHistory } = useCombatStore.getState();
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

  function handleOpenPlayerView() {
    window.open('/play', 'playerView', 'width=1280,height=720,menubar=no,toolbar=no,location=no,status=no');
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

        <button className="btn btn--secondary" onClick={handleOpenPlayerView} title="Open player view">
          &#128498; Player View
        </button>
        <button className="btn btn--danger" onClick={handleReset} title="Reset the entire encounter">
          &#128465; Reset
        </button>
      </div>
    </header>
  );
}

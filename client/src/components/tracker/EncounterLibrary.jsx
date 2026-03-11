import { useState, useCallback, useMemo, useRef } from 'react';
import useCombatStore from '../../store/useCombatStore';
import { useShallow } from 'zustand/react/shallow';
import { loadNamedEncounters, saveNamedEncounter, deleteNamedEncounter, exportEncounterJSON, importEncounterJSON } from '../../utils/encounterSaves';

export default function EncounterLibrary() {
  return <LocalEncounters />;
}

/* ── Local Encounters ──────────────────────────────────── */

function LocalEncounters() {
  const { combatants, state, currentRound, activeCreatureId, diceHistory } = useCombatStore(
    useShallow(s => ({
      combatants: s.combatants, state: s.state,
      currentRound: s.currentRound, activeCreatureId: s.activeCreatureId, diceHistory: s.diceHistory,
    }))
  );
  const loadSnapshot = useCombatStore(s => s.loadSnapshot);
  const [refresh, setRefresh] = useState(0);
  const [saveName, setSaveName] = useState('');
  const importRef = useRef(null);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const saves = useMemo(() => loadNamedEncounters(), [refresh]);

  const handleSave = useCallback(() => {
    if (!saveName.trim()) return;
    const id = `save_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    saveNamedEncounter({
      id,
      name: saveName.trim(),
      savedAt: new Date().toISOString(),
      snapshot: { name: saveName.trim(), combatants, state, currentRound, activeCreatureId, diceHistory },
    });
    setSaveName('');
    setRefresh(n => n + 1);
  }, [saveName, combatants, state, currentRound, activeCreatureId, diceHistory]);

  function handleLoad(save) {
    if (!window.confirm(`Load "${save.name}"? Unsaved changes will be lost.`)) return;
    loadSnapshot(save.snapshot);
  }

  function handleDelete(id) {
    if (!window.confirm('Delete this saved encounter?')) return;
    deleteNamedEncounter(id);
    setRefresh(n => n + 1);
  }

  function handleExport() {
    const { id, name: n, state: s, currentRound: cr, activeCreatureId: ac, combatants: c, diceHistory: dh } = useCombatStore.getState();
    exportEncounterJSON({ id, name: n, state: s, currentRound: cr, activeCreatureId: ac, combatants: c, diceHistory: dh });
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

  // suppress unused variable lint
  void refresh;

  return (
    <div className="encounter-library">
      <div className="encounter-library__list">
        {saves.length === 0 ? (
          <p className="encounter-library__empty">No saved encounters yet.</p>
        ) : (
          saves.map(save => (
            <EncounterRow
              key={save.id}
              name={save.name}
              count={save.snapshot?.combatants?.length || 0}
              date={save.savedAt}
              onLoad={() => handleLoad(save)}
              onDelete={() => handleDelete(save.id)}
            />
          ))
        )}
      </div>

      <div className="encounter-library__footer">
        <div className="encounter-library__actions-row">
          <button className="btn btn--secondary btn--sm" onClick={handleExport} title="Export as JSON file">
            &#8593; Export JSON
          </button>
          <label className="btn btn--secondary btn--sm" htmlFor="encounter-import" title="Import from JSON file" style={{ cursor: 'pointer' }}>
            &#8595; Import JSON
          </label>
          <input
            ref={importRef}
            type="file"
            id="encounter-import"
            accept=".json,application/json"
            className="hidden"
            onChange={handleImport}
          />
        </div>

        <div className="encounter-library__save-row">
          <input
            type="text"
            className="encounter-library__name-input"
            placeholder="Encounter name..."
            value={saveName}
            onChange={e => setSaveName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSave()}
          />
          <button
            className="btn btn--primary encounter-library__save-btn"
            onClick={handleSave}
            disabled={!saveName.trim()}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Shared row component ───────────────────────────────── */

function EncounterRow({ name, count, date, onLoad, onDelete }) {
  const formattedDate = date ? new Date(date).toLocaleDateString() : '';
  return (
    <div className="encounter-library__item">
      <div className="encounter-library__item-info">
        <span className="encounter-library__item-name">{name || 'Unnamed'}</span>
        <span className="encounter-library__item-meta">
          {count} creature{count !== 1 ? 's' : ''}{formattedDate && ` \u2014 ${formattedDate}`}
        </span>
      </div>
      <div className="encounter-library__item-actions">
        <button className="btn btn--secondary btn--sm" onClick={onLoad}>Load</button>
        <button className="btn btn--danger btn--sm" onClick={onDelete}>&times;</button>
      </div>
    </div>
  );
}

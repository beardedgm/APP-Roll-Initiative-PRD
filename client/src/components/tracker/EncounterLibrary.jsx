import { useState, useCallback } from 'react';
import { X } from 'lucide-react';
import useCombatStore from '../../store/useCombatStore';
import { useShallow } from 'zustand/react/shallow';
import useUserDataStore from '../../store/useUserDataStore';

export default function EncounterLibrary() {
  const { combatants, state, currentRound, activeCreatureId, diceHistory } = useCombatStore(
    useShallow(s => ({
      combatants: s.combatants, state: s.state,
      currentRound: s.currentRound, activeCreatureId: s.activeCreatureId, diceHistory: s.diceHistory,
    }))
  );
  const loadSnapshot = useCombatStore(s => s.loadSnapshot);

  const encounterPresets = useUserDataStore(s => s.encounterPresets);
  const addEncounterPreset = useUserDataStore(s => s.addEncounterPreset);
  const removeEncounterPreset = useUserDataStore(s => s.removeEncounterPreset);

  const [saveName, setSaveName] = useState('');

  const handleSave = useCallback(() => {
    if (!saveName.trim()) return;
    addEncounterPreset({
      name: saveName.trim(),
      combatants,
      state,
      currentRound,
      activeCreatureId,
      diceHistory,
    });
    setSaveName('');
  }, [saveName, combatants, state, currentRound, activeCreatureId, diceHistory, addEncounterPreset]);

  function handleLoad(preset) {
    if (!window.confirm(`Load "${preset.name}"? Unsaved changes will be lost.`)) return;
    loadSnapshot({
      name: preset.name,
      combatants: preset.combatants,
      state: preset.state,
      currentRound: preset.currentRound,
      activeCreatureId: preset.activeCreatureId,
      diceHistory: preset.diceHistory || [],
    });
  }

  function handleDelete(id) {
    if (!window.confirm('Delete this saved encounter?')) return;
    removeEncounterPreset(id);
  }

  return (
    <div className="encounter-library">
      <div className="encounter-library__list">
        {encounterPresets.length === 0 ? (
          <p className="encounter-library__empty">No saved encounters yet.</p>
        ) : (
          encounterPresets.map(preset => (
            <EncounterRow
              key={preset.id}
              name={preset.name}
              count={preset.combatants?.length || 0}
              date={preset.createdAt}
              onLoad={() => handleLoad(preset)}
              onDelete={() => handleDelete(preset.id)}
            />
          ))
        )}
      </div>

      <div className="encounter-library__footer">
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
          {count} creature{count !== 1 ? 's' : ''}{formattedDate && ` — ${formattedDate}`}
        </span>
      </div>
      <div className="encounter-library__item-actions">
        <button className="btn btn--secondary btn--sm" onClick={onLoad}>Load</button>
        <button className="btn btn--danger btn--sm" onClick={onDelete} title="Delete" aria-label={`Delete ${name || 'Unnamed'} encounter`}><X size={14} /></button>
      </div>
    </div>
  );
}

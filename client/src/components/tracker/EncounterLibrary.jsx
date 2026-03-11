import { useState, useCallback, useMemo } from 'react';
import useCombatStore from '../../store/useCombatStore';
import { useShallow } from 'zustand/react/shallow';
import { useCurrentUser } from '../../api/useAuth';
import { useEncounters, useCreateEncounter, useDeleteEncounter } from '../../api/useEncounters';
import { loadNamedEncounters, saveNamedEncounter, deleteNamedEncounter } from '../../utils/encounterSaves';

export default function EncounterLibrary() {
  const { data: user } = useCurrentUser();
  const isPremium = user && (user.subscriptionStatus === 'active' || user.role === 'admin');

  return isPremium ? <CloudEncounters /> : <LocalEncounters />;
}

/* ── Local Encounters (free users) ──────────────────────── */

function LocalEncounters() {
  const { name, combatants, state, currentRound, activeCreatureId, diceHistory } = useCombatStore(
    useShallow(s => ({
      name: s.name, combatants: s.combatants, state: s.state,
      currentRound: s.currentRound, activeCreatureId: s.activeCreatureId, diceHistory: s.diceHistory,
    }))
  );
  const loadSnapshot = useCombatStore(s => s.loadSnapshot);
  const [refresh, setRefresh] = useState(0);

  const saves = useMemo(() => loadNamedEncounters(), [refresh]);

  const handleSave = useCallback(() => {
    const saveName = window.prompt('Save encounter as:', name || 'New Encounter');
    if (!saveName?.trim()) return;
    const id = `save_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    saveNamedEncounter({
      id,
      name: saveName.trim(),
      savedAt: new Date().toISOString(),
      snapshot: { name: saveName.trim(), combatants, state, currentRound, activeCreatureId, diceHistory },
    });
    setRefresh(n => n + 1);
  }, [name, combatants, state, currentRound, activeCreatureId, diceHistory]);

  function handleLoad(save) {
    if (!window.confirm(`Load "${save.name}"? Unsaved changes will be lost.`)) return;
    loadSnapshot(save.snapshot);
  }

  function handleDelete(id) {
    if (!window.confirm('Delete this saved encounter?')) return;
    deleteNamedEncounter(id);
    setRefresh(n => n + 1);
  }

  // suppress unused variable lint
  void refresh;

  return (
    <div className="encounter-library">
      <button className="btn btn--primary btn--full encounter-library__save-btn" onClick={handleSave}>
        &#128190; Save Current Encounter
      </button>

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
    </div>
  );
}

/* ── Cloud Encounters (premium users) ───────────────────── */

function CloudEncounters() {
  const { name, combatants, state, currentRound, activeCreatureId, diceHistory } = useCombatStore(
    useShallow(s => ({
      name: s.name, combatants: s.combatants, state: s.state,
      currentRound: s.currentRound, activeCreatureId: s.activeCreatureId, diceHistory: s.diceHistory,
    }))
  );
  const loadSnapshot = useCombatStore(s => s.loadSnapshot);
  const setCloudId = useCombatStore(s => s.setCloudId);

  const { data: encounters = [], isLoading } = useEncounters();
  const createEncounter = useCreateEncounter();
  const deleteEncounter = useDeleteEncounter();

  const handleSave = useCallback(async () => {
    try {
      await createEncounter.mutateAsync({
        name: name || 'New Encounter',
        state, currentRound, activeCreatureId, combatants, diceHistory,
      });
    } catch {
      window.alert('Save failed. Please try again.');
    }
  }, [name, combatants, state, currentRound, activeCreatureId, diceHistory, createEncounter]);

  function handleLoad(enc) {
    if (!window.confirm(`Load "${enc.name}"? Unsaved changes will be lost.`)) return;
    loadSnapshot(enc);
    setCloudId(enc._id);
  }

  async function handleDelete(id) {
    if (!window.confirm('Delete this encounter from the cloud?')) return;
    try {
      await deleteEncounter.mutateAsync(id);
    } catch {
      window.alert('Delete failed.');
    }
  }

  return (
    <div className="encounter-library">
      <button
        className="btn btn--primary btn--full encounter-library__save-btn"
        onClick={handleSave}
        disabled={createEncounter.isPending}
      >
        &#9729; {createEncounter.isPending ? 'Saving...' : 'Save to Cloud'}
      </button>

      <div className="encounter-library__list">
        {isLoading ? (
          <p className="encounter-library__empty">Loading...</p>
        ) : encounters.length === 0 ? (
          <p className="encounter-library__empty">No cloud encounters yet.</p>
        ) : (
          encounters.map(enc => (
            <EncounterRow
              key={enc._id}
              name={enc.name}
              count={enc.combatantCount ?? enc.combatants?.length ?? 0}
              date={enc.updatedAt}
              onLoad={() => handleLoad(enc)}
              onDelete={() => handleDelete(enc._id)}
            />
          ))
        )}
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

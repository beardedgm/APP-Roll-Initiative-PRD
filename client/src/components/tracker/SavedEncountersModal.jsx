import { useState, useEffect } from 'react';
import useCombatStore from '../../store/useCombatStore';
import useUIStore from '../../store/useUIStore';
import { loadNamedEncounters, deleteNamedEncounter } from '../../utils/encounterSaves';
import Modal from '../ui/Modal';

export default function SavedEncountersModal() {
  const loadSnapshot = useCombatStore(s => s.loadSnapshot);
  const closeModal = useUIStore(s => s.closeModal);
  const activeModal = useUIStore(s => s.activeModal);
  const isOpen = activeModal === 'saved-encounters';
  const [saves, setSaves] = useState([]);

  useEffect(() => {
    if (isOpen) setSaves(loadNamedEncounters());
  }, [isOpen]);

  function handleLoad(id) {
    if (!window.confirm('Load this encounter? Unsaved changes will be lost.')) return;
    const save = saves.find(s => s.id === id);
    if (!save) return;
    loadSnapshot(save.snapshot);
    closeModal();
  }

  function handleDelete(id) {
    if (!window.confirm('Delete this saved encounter?')) return;
    deleteNamedEncounter(id);
    setSaves(loadNamedEncounters());
  }

  return (
    <Modal id="saved-encounters" title="&#128190; Saved Encounters">
      <div className="saved-encounters-list">
        {saves.length === 0 ? (
          <p className="empty-message">No saved encounters yet.</p>
        ) : (
          saves.map(save => {
            const date = new Date(save.savedAt).toLocaleDateString();
            const count = save.snapshot?.combatants?.length || 0;
            return (
              <div key={save.id} className="saved-encounter-row">
                <div className="saved-encounter-row__info">
                  <span className="saved-encounter-row__name">{save.name}</span>
                  <span className="saved-encounter-row__meta">
                    {count} creature{count !== 1 ? 's' : ''} &mdash; {date}
                  </span>
                </div>
                <div className="saved-encounter-row__actions">
                  <button className="btn btn--secondary btn--sm" onClick={() => handleLoad(save.id)}>
                    Load
                  </button>
                  <button className="btn btn--danger btn--sm" onClick={() => handleDelete(save.id)}>
                    Delete
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </Modal>
  );
}

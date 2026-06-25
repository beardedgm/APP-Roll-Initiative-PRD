import { useState, useCallback } from 'react';
import { Pencil, X } from 'lucide-react';
import useCombatStore from '../../store/useCombatStore';
import useUserDataStore from '../../store/useUserDataStore';

const EMPTY_FORM = { name: '', type: 'player', maxHP: '', ac: '10', initMod: '0' };

export default function CharacterLibrary() {
  const addCombatant = useCombatStore(s => s.addCombatant);
  const combatState = useCombatStore(s => s.state);

  const characters = useUserDataStore(s => s.characters);
  const addCharacter = useUserDataStore(s => s.addCharacter);
  const updateCharacter = useUserDataStore(s => s.updateCharacter);
  const removeCharacter = useUserDataStore(s => s.removeCharacter);

  const [form, setForm] = useState(EMPTY_FORM);
  const [editId, setEditId] = useState(null);
  const [error, setError] = useState('');

  const handleSave = useCallback(() => {
    const name = form.name.trim();
    if (!name) { setError('Name is required.'); return; }

    const charData = {
      name,
      type: form.type,
      maxHP: form.maxHP ? parseInt(form.maxHP, 10) || null : null,
      ac: parseInt(form.ac, 10) || 10,
      initMod: parseInt(form.initMod, 10) || 0,
    };

    if (editId) {
      updateCharacter(editId, charData);
    } else {
      addCharacter(charData);
    }

    setForm(EMPTY_FORM);
    setEditId(null);
    setError('');
  }, [form, editId, addCharacter, updateCharacter]);

  function handleEdit(char) {
    setEditId(char.id);
    setForm({
      name: char.name,
      type: char.type,
      maxHP: char.maxHP != null ? String(char.maxHP) : '',
      ac: String(char.ac ?? 10),
      initMod: String(char.initMod ?? 0),
    });
    setError('');
  }

  function handleDelete(id) {
    if (!window.confirm('Delete this character?')) return;
    removeCharacter(id);
    if (editId === id) { setEditId(null); setForm(EMPTY_FORM); }
  }

  function handleAdd(char) {
    const initiative = combatState === 'combat'
      ? parseInt(window.prompt(`Initiative roll for ${char.name}:`, '10'), 10) || 0
      : 0;
    addCombatant({
      name: char.name,
      maxHP: char.maxHP || 1,
      ac: char.ac || 10,
      initMod: char.initMod || 0,
      type: char.type,
      quantity: 1,
      initiative,
    });
  }

  function handleCancel() {
    setEditId(null);
    setForm(EMPTY_FORM);
    setError('');
  }

  return (
    <div className="character-library">
      <div className="character-library__list">
        {characters.length === 0 ? (
          <p className="character-library__empty">No saved characters yet. Add your party below!</p>
        ) : (
          characters.map(char => (
            <div key={char.id} className="character-library__item">
              <div className="character-library__item-info">
                <span className="character-library__item-name">{char.name}</span>
                <span className="character-library__item-meta">
                  <span className={`character-library__badge character-library__badge--${char.type}`}>
                    {char.type === 'player' ? 'PC' : 'NPC'}
                  </span>
                  {char.maxHP != null && <span>HP {char.maxHP}</span>}
                  <span>AC {char.ac ?? 10}</span>
                </span>
              </div>
              <div className="character-library__item-actions">
                <button className="btn btn--sm" onClick={() => handleEdit(char)} title="Edit" aria-label={`Edit ${char.name}`}><Pencil size={14} /></button>
                <button className="btn btn--sm btn--danger" onClick={() => handleDelete(char.id)} title="Delete" aria-label={`Delete ${char.name}`}><X size={14} /></button>
                <button className="monster-db__add-btn" onClick={() => handleAdd(char)} title="Add to encounter" aria-label={`Add ${char.name} to encounter`}>+</button>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="character-library__form">
        <h4 className="character-library__form-title">{editId ? 'Edit Character' : 'New Character'}</h4>
        {error && <div className="character-library__error">{error}</div>}
        <div className="character-library__form-row">
          <input
            type="text"
            className="character-library__input character-library__input--name"
            placeholder="Character name"
            value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            maxLength={40}
          />
          <select
            className="character-library__select"
            value={form.type}
            onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
          >
            <option value="player">Player</option>
            <option value="npc">NPC</option>
          </select>
        </div>
        <div className="character-library__form-row">
          <label className="character-library__field">
            <span>HP</span>
            <input type="number" min={1} max={9999} placeholder="—" value={form.maxHP} onChange={e => setForm(f => ({ ...f, maxHP: e.target.value }))} />
          </label>
          <label className="character-library__field">
            <span>AC</span>
            <input type="number" min={1} max={30} value={form.ac} onChange={e => setForm(f => ({ ...f, ac: e.target.value }))} />
          </label>
          <label className="character-library__field">
            <span>Init &plusmn;</span>
            <input type="number" min={-10} max={10} value={form.initMod} onChange={e => setForm(f => ({ ...f, initMod: e.target.value }))} />
          </label>
        </div>
        <div className="character-library__form-actions">
          <button className="btn btn--primary btn--sm" onClick={handleSave}>
            {editId ? 'Update' : '+ Save Character'}
          </button>
          {editId && (
            <button className="btn btn--sm" onClick={handleCancel}>Cancel</button>
          )}
        </div>
      </div>
    </div>
  );
}

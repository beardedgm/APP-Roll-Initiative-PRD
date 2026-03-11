import { useState, useRef } from 'react';
import useCombatStore from '../../store/useCombatStore';
import useUIStore from '../../store/useUIStore';
import Modal from '../ui/Modal';

export default function AddCombatantModal() {
  const activeModal = useUIStore(s => s.activeModal);
  const closeModal = useUIStore(s => s.closeModal);
  const combatState = useCombatStore(s => s.state);
  const addCombatant = useCombatStore(s => s.addCombatant);
  const nameRef = useRef(null);

  const [form, setForm] = useState({
    name: '',
    initiative: '',
    hp: '',
    ac: '10',
    initMod: '0',
    quantity: '1',
    type: 'monster',
  });

  if (activeModal !== 'add-combatant') return null;

  function handleSubmit(e) {
    e.preventDefault();
    const name = form.name.trim();
    const maxHP = parseInt(form.hp, 10);
    const ac = parseInt(form.ac, 10) || 10;
    const initMod = parseInt(form.initMod, 10) || 0;
    const quantity = Math.min(10, Math.max(1, parseInt(form.quantity, 10) || 1));
    const initiative = combatState === 'combat' ? parseInt(form.initiative, 10) : 0;

    if (!name) { nameRef.current?.focus(); return; }
    if (isNaN(maxHP) || maxHP < 1) return;
    if (combatState === 'combat' && isNaN(initiative)) return;

    addCombatant({ name, maxHP, ac, initMod, quantity, type: form.type, initiative });
    setForm({ name: '', initiative: '', hp: '', ac: '10', initMod: '0', quantity: '1', type: 'monster' });
    closeModal();
  }

  return (
    <Modal id="add-combatant" title="&#9876; Add Combatant">
      <form onSubmit={handleSubmit} autoComplete="off">
        <div className="form-row">
          <div className="form-group form-group--grow">
            <label htmlFor="modal-input-name">Name</label>
            <input
              ref={nameRef}
              type="text"
              id="modal-input-name"
              placeholder="Goblin Chief"
              required
              maxLength={40}
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            />
          </div>
          {combatState === 'combat' && (
            <div className="form-group form-group--narrow">
              <label htmlFor="modal-input-initiative">Initiative</label>
              <input
                type="number"
                id="modal-input-initiative"
                placeholder="15"
                min={-10}
                max={99}
                required
                value={form.initiative}
                onChange={e => setForm(f => ({ ...f, initiative: e.target.value }))}
              />
            </div>
          )}
          <div className="form-group form-group--xnarrow">
            <label htmlFor="modal-input-quantity">Qty</label>
            <input
              type="number"
              id="modal-input-quantity"
              placeholder="1"
              min={1}
              max={10}
              value={form.quantity}
              onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))}
            />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group form-group--narrow">
            <label htmlFor="modal-input-hp">Max HP</label>
            <input
              type="number"
              id="modal-input-hp"
              placeholder="30"
              min={1}
              max={9999}
              required
              value={form.hp}
              onChange={e => setForm(f => ({ ...f, hp: e.target.value }))}
            />
          </div>
          <div className="form-group form-group--xnarrow">
            <label htmlFor="modal-input-ac">AC</label>
            <input
              type="number"
              id="modal-input-ac"
              placeholder="10"
              min={1}
              max={30}
              value={form.ac}
              onChange={e => setForm(f => ({ ...f, ac: e.target.value }))}
            />
          </div>
          <div className="form-group form-group--xnarrow">
            <label htmlFor="modal-input-init-mod">Init &plusmn;</label>
            <input
              type="number"
              id="modal-input-init-mod"
              placeholder="0"
              min={-10}
              max={10}
              value={form.initMod}
              onChange={e => setForm(f => ({ ...f, initMod: e.target.value }))}
            />
          </div>
          <div className="form-group form-group--grow">
            <label htmlFor="modal-input-type">Type</label>
            <select
              id="modal-input-type"
              value={form.type}
              onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
            >
              <option value="player">Player</option>
              <option value="monster">Monster</option>
              <option value="npc">NPC</option>
            </select>
          </div>
          <div className="form-group form-group--auto">
            <label>&nbsp;</label>
            <button type="submit" className="btn btn--primary btn--full">+ Add</button>
          </div>
        </div>
      </form>
    </Modal>
  );
}

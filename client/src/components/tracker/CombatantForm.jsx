import { useState, useRef } from 'react';
import useCombatStore from '../../store/useCombatStore';

// f8: the free-tier "add my party" form. Reused by FreePartyPanel so free users
// can add a Player/NPC to the current (local) encounter. Monsters are added
// from the Creatures tab, so this form intentionally omits the monster type and
// the quantity field — party members are added one at a time.
export default function CombatantForm() {
  const combatState = useCombatStore(s => s.state);
  const addCombatant = useCombatStore(s => s.addCombatant);
  const nameRef = useRef(null);

  const [form, setForm] = useState({
    name: '',
    initiative: '',
    hp: '',
    ac: '10',
    initMod: '0',
    type: 'player',
  });

  function handleSubmit(e) {
    e.preventDefault();
    const name = form.name.trim();
    const maxHP = parseInt(form.hp, 10);
    const ac = parseInt(form.ac, 10) || 10;
    const initMod = parseInt(form.initMod, 10) || 0;
    const initiative = combatState === 'combat' ? parseInt(form.initiative, 10) : 0;

    if (!name) { nameRef.current?.focus(); return; }
    if (isNaN(maxHP) || maxHP < 1) return;
    if (combatState === 'combat' && isNaN(initiative)) return;

    addCombatant({ name, maxHP, ac, initMod, quantity: 1, type: form.type, initiative });
    setForm(f => ({ ...f, name: '', initiative: '', hp: '' }));
    nameRef.current?.focus();
  }

  return (
    <div className="panel" id="panel-add">
      <h2 className="panel__title">Add to Encounter</h2>
      <form onSubmit={handleSubmit} autoComplete="off">
        <div className="form-row">
          <div className="form-group form-group--grow">
            <label htmlFor="input-name">Name</label>
            <input
              ref={nameRef}
              type="text"
              id="input-name"
              placeholder="Aria the Bold"
              required
              maxLength={40}
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            />
          </div>
          {combatState === 'combat' && (
            <div className="form-group form-group--narrow">
              <label htmlFor="input-initiative">Initiative</label>
              <input
                type="number"
                id="input-initiative"
                placeholder="15"
                min={-10}
                max={99}
                required
                value={form.initiative}
                onChange={e => setForm(f => ({ ...f, initiative: e.target.value }))}
              />
            </div>
          )}
        </div>

        <div className="form-row">
          <div className="form-group form-group--narrow">
            <label htmlFor="input-hp">Max HP</label>
            <input
              type="number"
              id="input-hp"
              placeholder="30"
              min={1}
              max={9999}
              required
              value={form.hp}
              onChange={e => setForm(f => ({ ...f, hp: e.target.value }))}
            />
          </div>
          <div className="form-group form-group--xnarrow">
            <label htmlFor="input-ac">AC</label>
            <input
              type="number"
              id="input-ac"
              placeholder="10"
              min={1}
              max={30}
              value={form.ac}
              onChange={e => setForm(f => ({ ...f, ac: e.target.value }))}
            />
          </div>
          <div className="form-group form-group--xnarrow">
            <label htmlFor="input-init-mod">Init &plusmn;</label>
            <input
              type="number"
              id="input-init-mod"
              placeholder="0"
              min={-10}
              max={10}
              value={form.initMod}
              onChange={e => setForm(f => ({ ...f, initMod: e.target.value }))}
            />
          </div>
          <div className="form-group form-group--grow">
            <label htmlFor="input-type">Type</label>
            <select
              id="input-type"
              value={form.type}
              onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
            >
              <option value="player">Player</option>
              <option value="npc">NPC</option>
            </select>
          </div>
          <div className="form-group form-group--auto">
            <label>&nbsp;</label>
            <button type="submit" className="btn btn--primary btn--full">+ Add</button>
          </div>
        </div>
      </form>
    </div>
  );
}

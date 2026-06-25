import { useState, useEffect, useRef } from 'react';
import { Swords, RotateCcw, Play } from 'lucide-react';
import useCombatStore from '../../store/useCombatStore';
import useUIStore from '../../store/useUIStore';
import Modal from '../ui/Modal';

function rollDie(sides) {
  return Math.floor(Math.random() * sides) + 1;
}

function buildInitialRows(combatants) {
  return combatants.map(c => {
    if (c.type === 'player') {
      return { id: c.id, name: c.name, type: c.type, initiative: '', isPlayer: true };
    }
    const rolled = rollDie(20);
    const total = rolled + (c.initiativeModifier || 0);
    return {
      id: c.id, name: c.name, type: c.type, initiative: total,
      rolled, modifier: c.initiativeModifier || 0, isPlayer: false,
    };
  });
}

function StartCombatContent({ combatants, onStart, onClose }) {
  const [rows, setRows] = useState(() => buildInitialRows(combatants));
  const firstInputRef = useRef(null);

  useEffect(() => {
    setTimeout(() => firstInputRef.current?.focus(), 50);
  }, []);

  function handleReroll(id) {
    setRows(prev => prev.map(r => {
      if (r.id !== id || r.isPlayer) return r;
      const rolled = rollDie(20);
      return { ...r, rolled, initiative: rolled + r.modifier };
    }));
  }

  function handleSubmit() {
    for (const row of rows) {
      if (row.isPlayer && (row.initiative === '' || isNaN(parseInt(row.initiative, 10)))) {
        return;
      }
    }

    const initiativeMap = {};
    rows.forEach(r => {
      initiativeMap[r.id] = typeof r.initiative === 'number' ? r.initiative : parseInt(r.initiative, 10);
    });

    onStart(initiativeMap);
    onClose();
  }

  let firstInputSet = false;

  return (
    <>
      <p className="modal-instructions">
        Enter initiative scores for <strong>player characters</strong>.
        Monster and NPC initiatives have been auto-rolled (1d20 + modifier) — use <RotateCcw size={13} /> to reroll any result.
      </p>
      <div className="start-combat-rows">
        {rows.map(row => (
          <div key={row.id} className="start-combat-row">
            <span className="start-combat-row__name">{row.name}</span>
            <span className={`type-badge ${row.type}`}>
              {row.isPlayer ? 'PC' : row.type === 'npc' ? 'NPC' : 'Monster'}
            </span>
            {row.isPlayer ? (
              <input
                ref={!firstInputSet ? (el) => { firstInputRef.current = el; firstInputSet = true; } : undefined}
                type="number"
                className="start-combat-initiative-input"
                placeholder="Initiative"
                min={-5}
                max={30}
                value={row.initiative}
                onChange={e => setRows(prev => prev.map(r =>
                  r.id === row.id ? { ...r, initiative: e.target.value } : r
                ))}
              />
            ) : (
              <>
                <span className="start-combat-row__roll">
                  {row.initiative}
                  <span className="start-combat-roll-breakdown">
                    ({row.rolled}{row.modifier >= 0 ? '+' : ''}{row.modifier})
                  </span>
                </span>
                <button className="btn btn--reroll" onClick={() => handleReroll(row.id)} title="Re-roll initiative" aria-label={`Re-roll initiative for ${row.name}`}>
                  <RotateCcw size={13} />
                </button>
              </>
            )}
          </div>
        ))}
      </div>
      <div className="modal-footer">
        <button className="btn btn--secondary" onClick={onClose}>Cancel</button>
        <button className="btn btn--primary" onClick={handleSubmit}><Play size={16} /> Begin Combat!</button>
      </div>
    </>
  );
}

export default function StartCombatModal() {
  const combatants = useCombatStore(s => s.combatants);
  const startCombat = useCombatStore(s => s.startCombat);
  const closeModal = useUIStore(s => s.closeModal);
  const activeModal = useUIStore(s => s.activeModal);
  const isOpen = activeModal === 'start-combat';

  return (
    <Modal id="start-combat" title={<><Swords size={16} /> Start Combat</>}>
      {isOpen && (
        <StartCombatContent
          combatants={combatants}
          onStart={startCombat}
          onClose={closeModal}
        />
      )}
    </Modal>
  );
}

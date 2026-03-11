import { useState, useRef } from 'react';
import useCombatStore from '../../store/useCombatStore';
import HPBar from './HPBar';

export default function CombatantCard({ combatant, isActive, onDragStart, onDragOver, onDragLeave, onDrop, onDragEnd, onViewStatBlock }) {
  const { id, name, initiative, type, hp, ac, status, monsterSlug } = combatant;
  const isDead = hp.current <= 0 || status === 'unconscious';
  const initDisplay = Number.isInteger(initiative) ? initiative : initiative.toFixed(1);
  const removeCombatant = useCombatStore(s => s.removeCombatant);
  const applyDamageHeal = useCombatStore(s => s.applyDamageHeal);
  const [hpInput, setHpInput] = useState('');
  const [inputError, setInputError] = useState(false);
  const inputRef = useRef(null);

  function handleAction(action) {
    const amount = parseInt(hpInput, 10);
    if (isNaN(amount) || amount <= 0) {
      setInputError(true);
      setTimeout(() => setInputError(false), 600);
      inputRef.current?.focus();
      return;
    }
    applyDamageHeal(id, action, amount);
    setHpInput('');
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter') handleAction('damage');
  }

  return (
    <div
      className={`combatant-card type-border-${type}${isActive ? ' combatant-card--active' : ''}`}
      data-id={id}
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
    >
      <div className="combatant-card__header">
        <span className="drag-handle" title="Drag to reorder" role="img" aria-label="Drag to reorder">&#9776;</span>
        <div className="combatant-card__left">
          <span className="combatant-card__initiative">{initDisplay}</span>
          <div className="combatant-card__info">
            <span
              className={`combatant-card__name${isDead ? ' combatant-card__name--dead' : ''}${monsterSlug ? ' combatant-card__name--link' : ''}`}
              onClick={monsterSlug ? (e) => { e.stopPropagation(); onViewStatBlock?.(monsterSlug); } : undefined}
              role={monsterSlug ? 'button' : undefined}
              title={monsterSlug ? 'View stat block' : undefined}
            >
              {name}
            </span>
            <div className="combatant-card__badges">
              <span className={`type-badge ${type}`}>
                {type === 'npc' ? 'NPC' : type.charAt(0).toUpperCase() + type.slice(1)}
              </span>
              <span className="ac-badge" title="Armor Class">AC {ac}</span>
            </div>
          </div>
        </div>
        <button
          className="btn btn--remove"
          onClick={() => removeCombatant(id)}
          title={`Remove ${name}`}
          aria-label={`Remove ${name}`}
        >
          &times;
        </button>
      </div>

      <div className="combatant-card__hp">
        <HPBar current={hp.current} max={hp.max} />
        <div className="hp-controls">
          <span className="hp-text">
            {isDead && <>&skull; KO &mdash; </>}
            {hp.current} / {hp.max} HP
          </span>
          <div className="hp-inputs">
            <input
              ref={inputRef}
              type="number"
              className={`hp-input${inputError ? ' input-error' : ''}`}
              placeholder="Amt"
              min={1}
              max={9999}
              value={hpInput}
              onChange={e => setHpInput(e.target.value)}
              onKeyDown={handleKeyDown}
              title="Enter amount then click Dmg or Heal"
            />
            <button className="btn btn--dmg" onClick={() => handleAction('damage')}>Dmg</button>
            <button className="btn btn--heal" onClick={() => handleAction('heal')}>Heal</button>
          </div>
        </div>
      </div>
    </div>
  );
}

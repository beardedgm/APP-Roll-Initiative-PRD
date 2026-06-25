import { useState, useRef } from 'react';
import { GripVertical, ChevronRight, X, Shield, Skull, User } from 'lucide-react';
import useCombatStore from '../../store/useCombatStore';
function getHpColorClass(current, max) {
  if (current <= 0) return 'hp-text--dead';
  const pct = max > 0 ? (current / max) * 100 : 0;
  if (pct <= 25) return 'hp-text--low';
  if (pct <= 50) return 'hp-text--mid';
  return 'hp-text--high';
}

export default function CombatantCard({ combatant, isActive, onDragStart, onDragOver, onDragLeave, onDrop, onDragEnd, onViewStatBlock }) {
  const { id, name, initiative, type, hp, ac, status, monsterSlug } = combatant;
  const isDead = hp.current <= 0 || status === 'unconscious';
  const removeCombatant = useCombatStore(s => s.removeCombatant);
  const applyDamageHeal = useCombatStore(s => s.applyDamageHeal);
  const setCombatantInitiative = useCombatStore(s => s.setCombatantInitiative);
  const combatState = useCombatStore(s => s.state);
  const isPreCombat = combatState === 'pre-combat';
  const initDisplay = isPreCombat || initiative == null ? '—' : Number.isInteger(initiative) ? initiative : initiative.toFixed(1);
  const [hpInput, setHpInput] = useState('');
  const [inputError, setInputError] = useState(false);
  const [lastAction, setLastAction] = useState('damage');
  const [editingInit, setEditingInit] = useState(false);
  const [initDraft, setInitDraft] = useState('');
  const inputRef = useRef(null);
  const initInputRef = useRef(null);

  function handleAction(action) {
    const amount = parseInt(hpInput, 10);
    if (isNaN(amount) || amount <= 0) {
      setInputError(true);
      setTimeout(() => setInputError(false), 600);
      inputRef.current?.focus();
      return;
    }
    applyDamageHeal(id, action, amount);
    setLastAction(action);
    setHpInput('');
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      const action = e.shiftKey
        ? (lastAction === 'damage' ? 'heal' : 'damage')
        : lastAction;
      handleAction(action);
    }
  }

  function startEditInit() {
    if (isPreCombat) return;
    setInitDraft(initiative == null ? '' : String(initiative));
    setEditingInit(true);
    // focus/select on next tick
    setTimeout(() => {
      initInputRef.current?.focus();
      initInputRef.current?.select();
    }, 0);
  }

  function commitInit() {
    const parsed = parseInt(initDraft, 10);
    if (!isNaN(parsed)) {
      setCombatantInitiative(id, parsed);
    }
    setEditingInit(false);
  }

  function handleInitKeyDown(e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      commitInit();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setEditingInit(false);
    }
  }

  return (
    <div
      className={`combatant-card${isActive ? ' combatant-card--active' : ''}`}
      data-id={id}
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
    >
      <div className="combatant-card__row">
        {/* Left: identity */}
        <span className="drag-handle" title="Drag to reorder" role="img" aria-label="Drag to reorder"><GripVertical size={14} /></span>
        {editingInit ? (
          <input
            ref={initInputRef}
            type="number"
            className="combatant-card__initiative combatant-card__initiative-input"
            value={initDraft}
            onChange={e => setInitDraft(e.target.value)}
            onBlur={commitInit}
            onKeyDown={handleInitKeyDown}
            onClick={e => e.stopPropagation()}
            aria-label={`Initiative for ${name}`}
          />
        ) : (
          <span
            className={`combatant-card__initiative${isPreCombat ? ' combatant-card__initiative--dim' : ''}${isPreCombat ? '' : ' combatant-card__initiative--editable'}`}
            onClick={isPreCombat ? undefined : (e) => { e.stopPropagation(); startEditInit(); }}
            onKeyDown={isPreCombat ? undefined : (e) => {
              if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); startEditInit(); }
            }}
            title={isPreCombat ? undefined : 'Edit initiative to reorder'}
            role={isPreCombat ? undefined : 'button'}
            tabIndex={isPreCombat ? undefined : 0}
            aria-label={isPreCombat ? undefined : `Initiative ${initDisplay} for ${name}. Edit to reorder.`}
          >
            {initDisplay}
          </span>
        )}
        {isActive && <span className="combatant-card__active-arrow" aria-hidden="true"><ChevronRight size={12} /></span>}
        <span
          className={`combatant-card__name${isDead ? ' combatant-card__name--dead' : ''}${monsterSlug ? ' combatant-card__name--link' : ''}`}
          onClick={monsterSlug ? (e) => { e.stopPropagation(); onViewStatBlock?.(monsterSlug); } : undefined}
          role={monsterSlug ? 'button' : undefined}
          title={monsterSlug ? 'View stat block' : undefined}
        >
          {name}
        </span>
        <span className={`type-icon type-icon--${type}`} title={type === 'npc' ? 'NPC' : type.charAt(0).toUpperCase() + type.slice(1)}>
          {type === 'player' ? <Shield size={13} /> : type === 'monster' ? <Skull size={13} /> : <User size={13} />}
        </span>
        <span className="ac-badge" title="Armor Class">AC {ac}</span>

        {/* Right: HP + controls */}
        <div className="combatant-card__right">
          <span className={`hp-text ${getHpColorClass(hp.current, hp.max)}`}>{isDead ? '\u2620 ' : ''}{hp.current}/{hp.max}</span>
          <input
            ref={inputRef}
            type="number"
            className={`hp-input${inputError ? ' input-error' : ''}`}
            placeholder="10"
            min={1}
            max={9999}
            value={hpInput}
            onChange={e => setHpInput(e.target.value)}
            onKeyDown={handleKeyDown}
            title="Enter amount, then press Enter or click Dmg/Heal. Shift+Enter for opposite action."
          />
          <button className="btn btn--dmg" onClick={() => handleAction('damage')}>Dmg</button>
          <button className="btn btn--heal" onClick={() => handleAction('heal')}>Heal</button>
          <button
            className="btn btn--remove"
            onClick={() => removeCombatant(id)}
            title={`Remove ${name}`}
            aria-label={`Remove ${name}`}
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Full-width HP bar */}
    </div>
  );
}

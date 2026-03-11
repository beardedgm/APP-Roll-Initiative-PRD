import useCombatStore from '../../store/useCombatStore';

export default function TurnControls() {
  const combatState = useCombatStore(s => s.state);
  const combatants = useCombatStore(s => s.combatants);
  const activeCreatureId = useCombatStore(s => s.activeCreatureId);
  const currentRound = useCombatStore(s => s.currentRound);
  const nextTurn = useCombatStore(s => s.nextTurn);
  const prevTurn = useCombatStore(s => s.prevTurn);
  const canGoPrev = useCombatStore(s => s.canGoPrev);
  const endCombat = useCombatStore(s => s.endCombat);

  if (combatState === 'pre-combat') {
    return null;
  }

  const active = combatants.find(c => c.id === activeCreatureId);

  function handleEndCombat() {
    if (!window.confirm('End combat? Turn order will stop. Combatants and HP are kept.')) return;
    endCombat();
  }

  return (
    <div className="panel" id="panel-turns">
      <div className="turn-controls">
        <button className="btn btn--nav" disabled={!canGoPrev()} onClick={prevTurn}>
          &#9664; Prev
        </button>
        <div className="turn-info">
          <div className="turn-info__round">Round <span>{currentRound}</span></div>
          <div className="turn-info__name">{active ? active.name : '—'}</div>
        </div>
        <button className="btn btn--nav" disabled={combatants.length === 0} onClick={nextTurn}>
          Next &#9654;
        </button>
      </div>
      <button className="btn btn--danger btn--full" style={{ marginTop: 8 }} onClick={handleEndCombat}>
        End Combat
      </button>
    </div>
  );
}

import useCombatStore from '../../store/useCombatStore';
import useUIStore from '../../store/useUIStore';

export default function TurnControls() {
  const combatState = useCombatStore(s => s.state);
  const combatants = useCombatStore(s => s.combatants);
  const activeCreatureId = useCombatStore(s => s.activeCreatureId);
  const currentRound = useCombatStore(s => s.currentRound);
  const nextTurn = useCombatStore(s => s.nextTurn);
  const prevTurn = useCombatStore(s => s.prevTurn);
  const canGoPrev = useCombatStore(s => s.canGoPrev);
  const endCombat = useCombatStore(s => s.endCombat);
  const openModal = useUIStore(s => s.openModal);

  function handleEndCombat() {
    if (!window.confirm('End combat? Turn order will stop. Combatants and HP are kept.')) return;
    endCombat();
  }

  // Pre-combat: show Start Combat button
  if (combatState === 'pre-combat') {
    return (
      <div className="panel" id="panel-turns">
        <button
          className="btn btn--combat-start btn--full"
          disabled={combatants.length === 0}
          onClick={() => openModal('start-combat')}
        >
          &#9876; Start Combat
        </button>
      </div>
    );
  }

  // Combat: show turn controls + End Combat
  const active = combatants.find(c => c.id === activeCreatureId);

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
        <button className="btn btn--nav" disabled={combatants.length === 0} onClick={nextTurn} title="Spacebar">
          Next &#9654;
          <kbd className="kbd-hint">Space</kbd>
        </button>
      </div>
      <button className="btn btn--danger btn--full" style={{ marginTop: 8 }} onClick={handleEndCombat}>
        End Combat
      </button>
    </div>
  );
}

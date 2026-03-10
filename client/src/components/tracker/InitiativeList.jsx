import { useRef, useCallback } from 'react';
import useCombatStore from '../../store/useCombatStore';
import CombatantCard from './CombatantCard';

export default function InitiativeList({ onViewStatBlock }) {
  const combatants = useCombatStore(s => s.combatants);
  const activeCreatureId = useCombatStore(s => s.activeCreatureId);
  const combatState = useCombatStore(s => s.state);
  const reorderCombatant = useCombatStore(s => s.reorderCombatant);
  const dragSourceId = useRef(null);

  const onDragStart = useCallback((e) => {
    const card = e.currentTarget;
    dragSourceId.current = card.dataset.id;
    card.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', card.dataset.id);
  }, []);

  const onDragEnd = useCallback((e) => {
    e.currentTarget.classList.remove('dragging');
    document.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
    dragSourceId.current = null;
  }, []);

  const onDragOver = useCallback((e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    const target = e.currentTarget;
    if (target.dataset.id !== dragSourceId.current) {
      document.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
      target.classList.add('drag-over');
    }
  }, []);

  const onDragLeave = useCallback((e) => {
    e.currentTarget.classList.remove('drag-over');
  }, []);

  const onDrop = useCallback((e) => {
    e.preventDefault();
    const targetId = e.currentTarget.dataset.id;
    if (!dragSourceId.current || dragSourceId.current === targetId) return;
    reorderCombatant(dragSourceId.current, targetId);
  }, [reorderCombatant]);

  if (combatants.length === 0) {
    const msg = combatState === 'pre-combat'
      ? 'No combatants yet. Add one above.'
      : 'No combatants remaining.';
    return (
      <div className="panel panel--grow" id="panel-initiative">
        <h2 className="panel__title">Initiative Order</h2>
        <p className="empty-message">{msg}</p>
      </div>
    );
  }

  return (
    <div className="panel panel--grow" id="panel-initiative">
      <h2 className="panel__title">Initiative Order</h2>
      <div id="combatant-list">
        {combatants.map(c => (
          <CombatantCard
            key={c.id}
            combatant={c}
            isActive={c.id === activeCreatureId}
            onDragStart={onDragStart}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
            onDragEnd={onDragEnd}
            onViewStatBlock={onViewStatBlock}
          />
        ))}
      </div>
    </div>
  );
}

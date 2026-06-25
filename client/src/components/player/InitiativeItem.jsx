import { Shield, Skull, User, ChevronRight } from 'lucide-react';

const typeIcons = {
  player:  <Shield className="initiative-item__type-icon initiative-item__type-icon--player" />,
  monster: <Skull className="initiative-item__type-icon initiative-item__type-icon--monster" />,
  npc:     <User className="initiative-item__type-icon initiative-item__type-icon--npc" />,
};

function getStatusBadge(combatant) {
  if (combatant.type === 'player') return null;

  // Shared view provides healthStatus string (no raw HP)
  if (combatant.healthStatus) {
    if (combatant.healthStatus === 'unconscious') {
      return <span className="status-badge status-badge--unconscious">Unconscious</span>;
    }
    if (combatant.healthStatus === 'bloody') {
      return <span className="status-badge status-badge--bloody">Bloody</span>;
    }
    if (combatant.healthStatus === 'hurt') {
      return <span className="status-badge status-badge--hurt">Hurt</span>;
    }
    return null;
  }

  // Local view has full HP data
  const { hp, status } = combatant;
  if (status === 'unconscious' || hp.current <= 0) {
    return <span className="status-badge status-badge--unconscious">Unconscious</span>;
  }

  const hpPct = hp.max > 0 ? hp.current / hp.max : 0;
  if (hpPct <= 0.25) {
    return <span className="status-badge status-badge--bloody">Bloody</span>;
  }
  if (hp.current < hp.max) {
    return <span className="status-badge status-badge--hurt">Hurt</span>;
  }
  return null;
}

export default function InitiativeItem({ combatant, isActive }) {
  const { name, initiative, type, hp, status } = combatant;
  const isUnconscious = status === 'unconscious' || (hp && hp.current <= 0) || combatant.healthStatus === 'unconscious';
  const initDisplay = initiative == null ? '—' : Number.isInteger(initiative) ? initiative : initiative.toFixed(1);
  const badge = getStatusBadge(combatant);

  return (
    <li className={`initiative-item${isActive ? ' initiative-item--active' : ''}`}>
      <div className="initiative-item__left">
        {isActive && <span className="initiative-item__arrow"><ChevronRight /></span>}
        {typeIcons[type] || null}
        <span className={`initiative-item__name${isUnconscious ? ' initiative-item__name--unconscious' : ''}`}>
          {name}
        </span>
      </div>
      <div className="initiative-item__right">
        {badge}
        <span className="initiative-item__score">{initDisplay}</span>
      </div>
    </li>
  );
}

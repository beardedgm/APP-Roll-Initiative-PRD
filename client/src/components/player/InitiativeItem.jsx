function getStatusBadge(type, hp, status) {
  if (type === 'player') return null;

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
  const isUnconscious = status === 'unconscious' || hp.current <= 0;
  const initDisplay = Number.isInteger(initiative) ? initiative : initiative.toFixed(1);
  const badge = getStatusBadge(type, hp, status);

  return (
    <li className={`initiative-item type-border-${type}${isActive ? ' initiative-item--active' : ''}`}>
      <div className="initiative-item__left">
        {isActive && <span className="initiative-item__arrow">&#9654;</span>}
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

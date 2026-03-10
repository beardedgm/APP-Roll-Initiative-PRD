export default function HPBar({ current, max }) {
  const pct = max > 0 ? (current / max) * 100 : 0;
  const isDead = current <= 0;

  let hpClass = 'hp-high';
  if (isDead) hpClass = 'hp-dead';
  else if (pct <= 25) hpClass = 'hp-low';
  else if (pct <= 50) hpClass = 'hp-mid';

  return (
    <div className="hp-track">
      <div
        className={`hp-bar ${hpClass}`}
        style={{ width: `${Math.max(0, Math.min(100, pct))}%` }}
      />
    </div>
  );
}

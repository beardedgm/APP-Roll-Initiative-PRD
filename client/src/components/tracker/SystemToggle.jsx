/**
 * Segmented control for switching between 5E and PF2E game systems.
 * Used inside the Creatures and Spells tabs.
 *
 * Props:
 *   value    - '5e' | 'pf2e'
 *   onChange - (system: '5e' | 'pf2e') => void
 */
export default function SystemToggle({ value, onChange }) {
  return (
    <div className="system-toggle">
      <button
        className={`system-toggle__btn${value === '5e' ? ' system-toggle__btn--active' : ''}`}
        onClick={() => onChange('5e')}
        aria-pressed={value === '5e'}
      >
        5E
      </button>
      <button
        className={`system-toggle__btn${value === 'pf2e' ? ' system-toggle__btn--active' : ''}`}
        onClick={() => onChange('pf2e')}
        aria-pressed={value === 'pf2e'}
      >
        PF2E
      </button>
    </div>
  );
}

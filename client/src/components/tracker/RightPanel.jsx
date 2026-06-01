import ContentViewer from './ContentViewer';

/**
 * Right panel container: a single full-height info surface (content viewer).
 * The dice roller now floats independently (see FloatingDiceRoller), so it no
 * longer competes with stat blocks / spells for vertical space here.
 *
 * Props:
 *   onRollDice   - (notation: string) => void
 *   onSpellClick - (spellName: string) => void (future)
 */
export default function RightPanel({ onRollDice, onSpellClick }) {
  return (
    <div className="right-panel">
      <div className="right-panel__content">
        <ContentViewer onRollDice={onRollDice} onSpellClick={onSpellClick} />
      </div>
    </div>
  );
}

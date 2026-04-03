import { ChevronDown, ChevronUp, Dices } from 'lucide-react';
import useUIStore from '../../store/useUIStore';
import useCombatStore from '../../store/useCombatStore';
import DiceRoller from './DiceRoller';
import ContentViewer from './ContentViewer';

/**
 * Right panel container: collapsible dice roller on top, content viewer below.
 * The "Show Rolls" toggle is always visible in the header bar regardless of
 * collapsed/expanded state.
 *
 * Props:
 *   onRollDice   - (notation: string) => void
 *   onSpellClick - (spellName: string) => void (future)
 */
export default function RightPanel({ onRollDice, onSpellClick }) {
  const diceRollerExpanded = useUIStore(s => s.diceRollerExpanded);
  const toggleDiceRoller = useUIStore(s => s.toggleDiceRoller);
  const diceHistory = useCombatStore(s => s.diceHistory);
  const showRollsToPlayers = useCombatStore(s => s.showRollsToPlayers);
  const toggleShowRolls = useCombatStore(s => s.toggleShowRolls);

  const lastRoll = diceHistory.length > 0 ? diceHistory[0] : null;
  const lastRollSummary = lastRoll
    ? `${lastRoll.count}d${lastRoll.sides}${lastRoll.modifier >= 0 ? '+' : ''}${lastRoll.modifier} = ${lastRoll.total}`
    : null;

  return (
    <div className="right-panel">
      <div className="right-panel__dice-section">
        {/* Header bar — always visible */}
        <div className="right-panel__dice-header">
          <button
            className="right-panel__dice-toggle"
            onClick={toggleDiceRoller}
            aria-label={diceRollerExpanded ? 'Collapse dice roller' : 'Expand dice roller'}
          >
            <span className="right-panel__dice-toggle-left">
              <Dices size={16} /> Dice Roller
            </span>
            {!diceRollerExpanded && lastRollSummary && (
              <span className="right-panel__dice-collapsed-last">
                {lastRollSummary}
              </span>
            )}
            {diceRollerExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>

          <label className="show-rolls-toggle" title="Broadcast dice rolls to the player view">
            <span className="show-rolls-toggle__label">Show Rolls</span>
            <button
              type="button"
              role="switch"
              aria-checked={showRollsToPlayers}
              className={`show-rolls-toggle__switch${showRollsToPlayers ? ' show-rolls-toggle__switch--on' : ''}`}
              onClick={toggleShowRolls}
            >
              <span className="show-rolls-toggle__knob" />
            </button>
          </label>
        </div>

        {/* Expanded dice roller body */}
        {diceRollerExpanded && <DiceRoller />}
      </div>

      <div className="right-panel__content">
        <ContentViewer onRollDice={onRollDice} onSpellClick={onSpellClick} />
      </div>
    </div>
  );
}

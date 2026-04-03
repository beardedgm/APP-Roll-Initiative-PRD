import { ChevronDown, ChevronUp, Dices } from 'lucide-react';
import useUIStore from '../../store/useUIStore';
import useCombatStore from '../../store/useCombatStore';
import DiceRoller from './DiceRoller';
import ContentViewer from './ContentViewer';

/**
 * Right panel container: collapsible dice roller on top, content viewer below.
 *
 * Props:
 *   onRollDice   - (notation: string) => void
 *   onSpellClick - (spellName: string) => void (future)
 */
export default function RightPanel({ onRollDice, onSpellClick }) {
  const diceRollerExpanded = useUIStore(s => s.diceRollerExpanded);
  const toggleDiceRoller = useUIStore(s => s.toggleDiceRoller);
  const diceHistory = useCombatStore(s => s.diceHistory);

  const lastRoll = diceHistory.length > 0 ? diceHistory[0] : null;
  const lastRollSummary = lastRoll
    ? `${lastRoll.count}d${lastRoll.sides}${lastRoll.modifier >= 0 ? '+' : ''}${lastRoll.modifier} = ${lastRoll.total}`
    : null;

  return (
    <div className="right-panel">
      <div className="right-panel__dice-section">
        {diceRollerExpanded ? (
          <div className="right-panel__dice-expanded">
            <button
              className="right-panel__dice-collapse-btn"
              onClick={toggleDiceRoller}
              aria-label="Collapse dice roller"
            >
              <ChevronUp size={14} />
            </button>
            <DiceRoller />
          </div>
        ) : (
          <button
            className="right-panel__dice-collapsed"
            onClick={toggleDiceRoller}
            aria-label="Expand dice roller"
          >
            <span className="right-panel__dice-collapsed-left">
              <Dices size={16} /> Dice Roller
            </span>
            {lastRollSummary && (
              <span className="right-panel__dice-collapsed-last">
                Last: {lastRollSummary}
              </span>
            )}
            <ChevronDown size={14} />
          </button>
        )}
      </div>

      <div className="right-panel__content">
        <ContentViewer onRollDice={onRollDice} onSpellClick={onSpellClick} />
      </div>
    </div>
  );
}

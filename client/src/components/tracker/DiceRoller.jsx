import { useState } from 'react';
import useCombatStore from '../../store/useCombatStore';

function buildEntryLabel(entry) {
  const { sides, count, modifier, advantage } = entry;
  const countStr = advantage !== 'normal' ? '1' : `${count}`;
  const advStr = advantage === 'advantage' ? ' Adv' : advantage === 'disadvantage' ? ' Dis' : '';
  const modStr = modifier > 0 ? `+${modifier}` : modifier < 0 ? `${modifier}` : '+0';
  return `${countStr}d${sides}${advStr}${modStr}`;
}

/**
 * Build the breakdown array for a dice roll entry.
 * Always includes all die results + modifier at end (in a styled span).
 * Example: 2d6+5 → (3, 2, <span>5</span>)
 */
function buildBreakdown(entry) {
  const { rolls, modifier, advantage } = entry;

  if (advantage !== 'normal') {
    const usedVal = advantage === 'advantage' ? Math.max(...rolls) : Math.min(...rolls);
    const diceElements = rolls.map((r, i) => (
      r === usedVal ? <b key={`r${i}`}>{r}</b> : <s key={`r${i}`}>{r}</s>
    )).reduce((acc, el, i) => i === 0 ? [el] : [...acc, ', ', el], []);
    return [...diceElements, ', ', <span key="mod" className="dice-mod">{modifier}</span>];
  }

  const parts = rolls.map((r, i) => (
    i === 0 ? String(r) : `, ${r}`
  ));
  return [...parts, ', ', <span key="mod" className="dice-mod">{modifier}</span>];
}

function RollBreakdown({ entry }) {
  return (
    <span className="dice-result__breakdown">
      ({buildBreakdown(entry)})
    </span>
  );
}

export default function DiceRoller() {
  const diceHistory = useCombatStore(s => s.diceHistory);
  const rollDice = useCombatStore(s => s.rollDice);
  const clearDiceHistory = useCombatStore(s => s.clearDiceHistory);
  const [count, setCount] = useState('1');
  const [modifier, setModifier] = useState('0');
  const [advMode, setAdvMode] = useState('normal');
  const [lastResult, setLastResult] = useState(null);

  function handleRoll(sides) {
    const entry = rollDice({
      sides,
      count: Math.max(1, Math.min(20, parseInt(count, 10) || 1)),
      modifier: parseInt(modifier, 10) || 0,
      advantage: advMode,
    });
    setLastResult(entry);
  }

  function handleReroll(entryId) {
    const entry = diceHistory.find(e => e.id === entryId);
    if (!entry) return;
    const rerolled = rollDice({
      sides: entry.sides,
      count: entry.count,
      modifier: entry.modifier,
      advantage: entry.advantage,
    });
    setLastResult(rerolled);
  }

  const dies = [4, 6, 8, 10, 12, 20];

  return (
    <div className="panel" id="panel-dice">
      <h2 className="panel__title">&#127922; Dice Roller</h2>

      <div className="dice-grid">
        {dies.map(d => (
          <button key={d} className="btn btn--die" onClick={() => handleRoll(d)}>d{d}</button>
        ))}
        <button className="btn btn--die btn--die-wide" onClick={() => handleRoll(100)}>d100</button>
      </div>

      <div className="dice-controls-row">
        <div className="dice-field">
          <label htmlFor="dice-count">Count</label>
          <input
            type="number"
            id="dice-count"
            value={count}
            min={1}
            max={20}
            disabled={advMode !== 'normal'}
            onChange={e => setCount(e.target.value)}
          />
        </div>
        <div className="dice-field">
          <label htmlFor="dice-modifier">Modifier</label>
          <input
            type="number"
            id="dice-modifier"
            value={modifier}
            min={-20}
            max={20}
            onChange={e => setModifier(e.target.value)}
          />
        </div>
      </div>

      <div className="dice-adv-row">
        {['normal', 'advantage', 'disadvantage'].map(mode => (
          <button
            key={mode}
            className={`btn btn--adv-toggle${advMode === mode ? ' btn--adv-toggle--active' : ''}`}
            onClick={() => setAdvMode(mode)}
          >
            {mode === 'normal' ? 'Normal' : mode === 'advantage' ? 'Adv' : 'Dis'}
          </button>
        ))}
      </div>

      <div className="dice-result" id="dice-result">
        {lastResult ? (
          <>
            <span className="dice-result__label">{buildEntryLabel(lastResult)}</span>
            <span className="dice-result__total">{lastResult.total}</span>
            <RollBreakdown entry={lastResult} />
          </>
        ) : (
          <span className="dice-result__label">Roll a die above</span>
        )}
      </div>

      <div className="dice-history">
        <div className="dice-history__header">
          <h3 className="dice-history__title">History</h3>
          <button className="btn btn--icon btn--sm" onClick={clearDiceHistory} title="Clear dice history">
            &#10005;
          </button>
        </div>
        <ol id="dice-history-list">
          {(!diceHistory || diceHistory.length === 0) ? (
            <li className="text-muted">No rolls yet.</li>
          ) : (
            diceHistory.map(entry => {
              const label = buildEntryLabel(entry);
              return (
                <li key={entry.id} className="dice-history__entry">
                  <span className="dice-history__content">
                    <span className="dice-history__die">{label}</span>
                    {' = '}<strong>{entry.total}</strong>
                    {' '}<span className="text-muted">({buildBreakdown(entry)})</span>
                  </span>
                  <button
                    className="btn btn--reroll-history"
                    onClick={() => handleReroll(entry.id)}
                    title={`Re-roll ${label}`}
                  >
                    &#8635;
                  </button>
                </li>
              );
            })
          )}
        </ol>
      </div>
    </div>
  );
}

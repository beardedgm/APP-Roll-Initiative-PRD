import { useState, useEffect, useRef } from 'react';
import useCombatStore from '../../store/useCombatStore';

function buildLabel(entry) {
  const { sides, count, modifier, advantage } = entry;
  const countStr = (advantage !== 'normal' || count === 1) ? '' : `${count}`;
  const advStr = advantage === 'advantage' ? ' Adv' : advantage === 'disadvantage' ? ' Dis' : '';
  const modStr = modifier > 0 ? `+${modifier}` : modifier < 0 ? `${modifier}` : '';
  return `${countStr}d${sides}${advStr}${modStr}`;
}

function Breakdown({ entry }) {
  const { rolls, modifier, advantage } = entry;
  if (advantage !== 'normal') {
    const used = advantage === 'advantage' ? Math.max(...rolls) : Math.min(...rolls);
    return (
      <span className="dice-toast__breakdown">
        ({rolls.map((r, i) => (
          r === used ? <b key={i}>{r}</b> : <s key={i}>{r}</s>
        )).reduce((acc, el, i) => i === 0 ? [el] : [...acc, ', ', el], [])})
      </span>
    );
  }
  if (rolls.length > 1) return <span className="dice-toast__breakdown">({rolls.join(', ')})</span>;
  if (modifier !== 0) return <span className="dice-toast__breakdown">(rolled {rolls[0]})</span>;
  return null;
}

export default function DiceToast() {
  const diceHistory = useCombatStore(s => s.diceHistory);
  const [entry, setEntry] = useState(null);
  const [visible, setVisible] = useState(false);
  const prevLenRef = useRef(diceHistory?.length ?? 0);
  const animKey = useRef(0);

  useEffect(() => {
    const len = diceHistory?.length ?? 0;
    if (len > 0 && len !== prevLenRef.current) {
      const latest = diceHistory[0]; // newest is first
      animKey.current += 1;
      setEntry(latest);
      setVisible(true);
    }
    prevLenRef.current = len;
  }, [diceHistory]);

  function handleDismiss() {
    setVisible(false);
  }

  if (!entry) return null;

  return (
    <div className={`dice-toast${visible ? ' dice-toast--visible' : ''}`} key={animKey.current}>
      <button className="dice-toast__close" onClick={handleDismiss} title="Dismiss">&#10005;</button>
      <span className="dice-toast__label">{buildLabel(entry)}</span>
      <span className="dice-toast__total">{entry.total}</span>
      <Breakdown entry={entry} />
    </div>
  );
}

import { useState } from 'react';
import { X } from 'lucide-react';
import useCombatStore from '../../store/useCombatStore';

function buildLabel(entry) {
  const { sides, count, modifier, advantage } = entry;
  const countStr = advantage !== 'normal' ? '1' : `${count}`;
  const advStr = advantage === 'advantage' ? ' Adv' : advantage === 'disadvantage' ? ' Dis' : '';
  const modStr = modifier > 0 ? `+${modifier}` : modifier < 0 ? `${modifier}` : '+0';
  return `${countStr}d${sides}${advStr}${modStr}`;
}

function Breakdown({ entry }) {
  const { rolls, modifier, advantage } = entry;

  if (advantage !== 'normal') {
    const used = advantage === 'advantage' ? Math.max(...rolls) : Math.min(...rolls);
    const diceElements = rolls.map((r, i) => (
      r === used ? <b key={`r${i}`}>{r}</b> : <s key={`r${i}`}>{r}</s>
    )).reduce((acc, el, i) => i === 0 ? [el] : [...acc, ', ', el], []);
    return (
      <span className="dice-toast__breakdown">
        ({diceElements}, <span className="dice-mod">{modifier}</span>)
      </span>
    );
  }

  const parts = rolls.map((r, i) => (i === 0 ? String(r) : `, ${r}`));
  return (
    <span className="dice-toast__breakdown">
      ({parts}, <span className="dice-mod">{modifier}</span>)
    </span>
  );
}

function getNatClass(entry) {
  if (!entry || entry.sides !== 20) return '';
  if (entry.rolls.some(r => r === 20)) return 'dice-nat20';
  if (entry.rolls.some(r => r === 1)) return 'dice-nat1';
  return '';
}

export default function DiceToast() {
  const diceHistory = useCombatStore(s => s.diceHistory);
  const [dismissedId, setDismissedId] = useState(null);

  const entry = diceHistory?.length > 0 ? diceHistory[0] : null;
  const visible = entry !== null && entry.id !== dismissedId;

  if (!entry) return null;

  return (
    <div className={`dice-toast${visible ? ' dice-toast--visible' : ''} ${getNatClass(entry)}`} key={entry.id}>
      <button className="dice-toast__close" onClick={() => setDismissedId(entry.id)} title="Dismiss"><X size={14} /></button>
      <span className="dice-toast__label">{buildLabel(entry)}</span>
      <span className="dice-toast__total">{entry.total}</span>
      <Breakdown entry={entry} />
    </div>
  );
}

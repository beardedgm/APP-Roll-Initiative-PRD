import { useState, useEffect, useRef } from 'react';

function getNatClass(entry) {
  if (!entry || entry.sides !== 20) return '';
  if (entry.rolls.some(r => r === 20)) return 'player-dice-toast--nat20';
  if (entry.rolls.some(r => r === 1)) return 'player-dice-toast--nat1';
  return '';
}

function Breakdown({ entry }) {
  const { rolls, modifier, advantage } = entry;

  if (advantage !== 'normal') {
    const used = advantage === 'advantage' ? Math.max(...rolls) : Math.min(...rolls);
    const parts = rolls.map((r, i) => (
      r === used
        ? <b key={`r${i}`}>{r}</b>
        : <s key={`r${i}`} style={{ opacity: 0.5 }}>{r}</s>
    )).reduce((acc, el, i) => i === 0 ? [el] : [...acc, ', ', el], []);
    return <span className="player-dice-toast__breakdown">({parts}, <span className="player-dice-toast__mod">{modifier}</span>)</span>;
  }

  const parts = rolls.map((r, i) => (i === 0 ? String(r) : `, ${r}`));
  return <span className="player-dice-toast__breakdown">({parts}, <span className="player-dice-toast__mod">{modifier}</span>)</span>;
}

export default function PlayerDiceToast({ latestSharedRoll }) {
  const [visible, setVisible] = useState(false);
  const [roll, setRoll] = useState(null);
  const lastTimestampRef = useRef(null);
  const timerRef = useRef(null);

  useEffect(() => {
    if (!latestSharedRoll || latestSharedRoll.timestamp === lastTimestampRef.current) return;

    lastTimestampRef.current = latestSharedRoll.timestamp;
    setRoll(latestSharedRoll);
    setVisible(true);

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setVisible(false), 6000);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [latestSharedRoll]);

  if (!roll || !visible) return null;

  return (
    <div className={`player-dice-toast ${getNatClass(roll)}`} key={roll.timestamp}>
      <span className="player-dice-toast__label">{roll.label}</span>
      <span className="player-dice-toast__total">{roll.total}</span>
      <Breakdown entry={roll} />
      <div className="player-dice-toast__timer" />
    </div>
  );
}

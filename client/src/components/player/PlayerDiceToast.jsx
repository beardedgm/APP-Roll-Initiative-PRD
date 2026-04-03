import { useState, useEffect, useRef, useCallback } from 'react';

function getNatClass(entry) {
  if (!entry || entry.sides !== 20) return '';
  if (entry.rolls.some(r => r === 20)) return 'player-dice-toast--nat20';
  if (entry.rolls.some(r => r === 1)) return 'player-dice-toast--nat1';
  return '';
}

function formatMod(modifier) {
  if (modifier > 0) return `+${modifier}`;
  if (modifier < 0) return `${modifier}`;
  return '+0';
}

function Breakdown({ entry }) {
  const { rolls, modifier, advantage } = entry;
  const modStr = formatMod(modifier);

  if (advantage !== 'normal') {
    const used = advantage === 'advantage' ? Math.max(...rolls) : Math.min(...rolls);
    const parts = rolls.map((r, i) => (
      r === used
        ? <b key={`r${i}`}>{r}</b>
        : <s key={`r${i}`} style={{ opacity: 0.5 }}>{r}</s>
    )).reduce((acc, el, i) => i === 0 ? [el] : [...acc, ', ', el], []);
    return <span className="player-dice-toast__breakdown">({parts}, <span className="player-dice-toast__mod">{modStr}</span>)</span>;
  }

  const parts = rolls.map((r, i) => (i === 0 ? String(r) : `, ${r}`));
  return <span className="player-dice-toast__breakdown">({parts}, <span className="player-dice-toast__mod">{modStr}</span>)</span>;
}

export default function PlayerDiceToast({ latestSharedRoll }) {
  const [dismissedTimestamp, setDismissedTimestamp] = useState(null);
  const timerRef = useRef(null);

  const timestamp = latestSharedRoll?.timestamp ?? null;
  const visible = timestamp !== null && timestamp !== dismissedTimestamp;

  const dismiss = useCallback(() => {
    setDismissedTimestamp(timestamp);
  }, [timestamp]);

  // Auto-dismiss timer — subscribes to external timeout system
  useEffect(() => {
    if (!visible) return;

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(dismiss, 6000);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [visible, dismiss]);

  if (!latestSharedRoll || !visible) return null;

  return (
    <div className={`player-dice-toast ${getNatClass(latestSharedRoll)}`} key={timestamp}>
      <span className="player-dice-toast__label">{latestSharedRoll.label}</span>
      <span className="player-dice-toast__total">{latestSharedRoll.total}</span>
      <Breakdown entry={latestSharedRoll} />
      <div className="player-dice-toast__timer" />
    </div>
  );
}

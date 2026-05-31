import { useState, useEffect, useRef, useCallback } from 'react';

// Players see only the result — never the dice notation, modifier, or
// individual die faces (those would leak a creature's bonuses). The nat-20
// (gold) / nat-1 (red) highlight on d20 rolls is preserved.
//
// The shared (/play/:code) endpoint sends a precomputed `crit` flag. The local
// same-device player view passes the full combat-store roll, so fall back to
// deriving the crit from sides/rolls when no flag is present.
function deriveCrit(entry) {
  if (entry.sides !== 20 || !Array.isArray(entry.rolls)) return null;
  if (entry.rolls.some(r => r === 20)) return 'nat20';
  if (entry.rolls.some(r => r === 1)) return 'nat1';
  return null;
}

function getNatClass(entry) {
  if (!entry) return '';
  const crit = entry.crit ?? deriveCrit(entry);
  if (crit === 'nat20') return 'player-dice-toast--nat20';
  if (crit === 'nat1') return 'player-dice-toast--nat1';
  return '';
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
      <span className="player-dice-toast__total">{latestSharedRoll.total}</span>
      <div className="player-dice-toast__timer" />
    </div>
  );
}

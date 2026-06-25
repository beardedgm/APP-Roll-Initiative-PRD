import { useCallback, useEffect, useRef, useState } from 'react';
import { Dices, X } from 'lucide-react';
import useUIStore from '../../store/useUIStore';
import useCombatStore from '../../store/useCombatStore';
import DiceRoller from './DiceRoller';

const EDGE = 8; // viewport padding when clamping
const MIN_W = 260;
const MIN_H = 220;
const MAX_W = 600;

function clampToViewport(pos, width, height) {
  const maxX = Math.max(EDGE, window.innerWidth - width - EDGE);
  const maxY = Math.max(EDGE, window.innerHeight - height - EDGE);
  return {
    x: Math.min(maxX, Math.max(EDGE, pos.x)),
    y: Math.min(maxY, Math.max(EDGE, pos.y)),
  };
}

/**
 * Floating, dismissible dice roller. Lives outside the right-panel grid as a
 * sibling of DiceToast so the right panel can be a full-height info surface.
 * Toggled from the header Dices button; closed via its own X or Escape.
 * Draggable by its header and resizable from the bottom-right grip; both
 * position and size persist (clamped back into view on load).
 */
export default function FloatingDiceRoller() {
  const open = useUIStore(s => s.diceRollerOpen);
  const closeDiceRoller = useUIStore(s => s.closeDiceRoller);
  const storePos = useUIStore(s => s.diceRollerPos);
  const setDiceRollerPos = useUIStore(s => s.setDiceRollerPos);
  const storeSize = useUIStore(s => s.diceRollerSize);
  const setDiceRollerSize = useUIStore(s => s.setDiceRollerSize);
  const showRollsToPlayers = useCombatStore(s => s.showRollsToPlayers);
  const toggleShowRolls = useCombatStore(s => s.toggleShowRolls);

  const panelRef = useRef(null);
  const [pos, setPos] = useState(storePos);
  const [size, setSize] = useState(storeSize);

  // Close on Escape while open.
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') closeDiceRoller(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, closeDiceRoller]);

  // On open, clamp any saved size + position back into the viewport (handles a
  // window resized smaller since last session). Measured in rAF after layout.
  useEffect(() => {
    if (!open) return undefined;
    const raf = requestAnimationFrame(() => {
      if (!panelRef.current) return;
      if (storeSize) {
        const w = Math.min(storeSize.w, window.innerWidth - 2 * EDGE);
        const h = Math.min(storeSize.h, window.innerHeight - 2 * EDGE);
        if (w !== storeSize.w || h !== storeSize.h) {
          const next = { w, h };
          setSize(next);
          setDiceRollerSize(next);
        }
      }
      if (storePos) {
        const rect = panelRef.current.getBoundingClientRect();
        const clamped = clampToViewport(storePos, rect.width, rect.height);
        if (clamped.x !== storePos.x || clamped.y !== storePos.y) {
          setPos(clamped);
          setDiceRollerPos(clamped);
        }
      }
    });
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const handleDragStart = useCallback((e) => {
    if (e.button !== 0 || !panelRef.current) return;
    // Don't start a drag from the interactive controls in the header.
    if (e.target.closest('button, label, [role="switch"]')) return;
    e.preventDefault();
    const rect = panelRef.current.getBoundingClientRect();
    const startX = e.clientX;
    const startY = e.clientY;
    const origX = rect.left;
    const origY = rect.top;
    const { width, height } = rect;
    document.body.classList.add('is-resizing');

    let latest = { x: origX, y: origY };
    const onMove = (moveEvent) => {
      latest = clampToViewport(
        { x: origX + (moveEvent.clientX - startX), y: origY + (moveEvent.clientY - startY) },
        width,
        height,
      );
      setPos(latest);
    };
    const onUp = () => {
      document.body.classList.remove('is-resizing');
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      setDiceRollerPos(latest);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }, [setDiceRollerPos]);

  const handleResizeStart = useCallback((e) => {
    if (e.button !== 0 || !panelRef.current) return;
    e.preventDefault();
    e.stopPropagation();
    const rect = panelRef.current.getBoundingClientRect();
    // Pin the top-left so the panel grows toward the bottom-right grip.
    const pinned = { x: rect.left, y: rect.top };
    setPos(pinned);
    setDiceRollerPos(pinned);

    const startX = e.clientX;
    const startY = e.clientY;
    const startW = rect.width;
    const startH = rect.height;
    document.body.classList.add('is-resizing');

    let latest = { w: startW, h: startH };
    const onMove = (moveEvent) => {
      const maxW = Math.min(MAX_W, window.innerWidth - pinned.x - EDGE);
      const maxH = window.innerHeight - pinned.y - EDGE;
      latest = {
        w: Math.max(MIN_W, Math.min(maxW, startW + (moveEvent.clientX - startX))),
        h: Math.max(MIN_H, Math.min(maxH, startH + (moveEvent.clientY - startY))),
      };
      setSize(latest);
    };
    const onUp = () => {
      document.body.classList.remove('is-resizing');
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      setDiceRollerSize(latest);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }, [setDiceRollerPos, setDiceRollerSize]);

  if (!open) return null;

  // When positioned/sized, override the CSS bottom-right anchor + default dims.
  const style = {
    ...(pos ? { left: `${pos.x}px`, top: `${pos.y}px`, right: 'auto', bottom: 'auto' } : null),
    ...(size ? { width: `${size.w}px`, height: `${size.h}px` } : null),
  };

  return (
    <div
      ref={panelRef}
      className="dice-roller-float"
      style={style}
      role="dialog"
      aria-modal="false"
      aria-label="Dice roller"
    >
      <div className="dice-roller-float__header" onMouseDown={handleDragStart}>
        <span className="dice-roller-float__title">
          <Dices size={16} /> Dice Roller
        </span>

        <div className="dice-roller-float__actions">
          <label className="show-rolls-toggle" title="Broadcast dice rolls to the player view">
            <span className="show-rolls-toggle__label">Show Rolls</span>
            <button
              type="button"
              role="switch"
              aria-checked={showRollsToPlayers}
              aria-label="Show dice rolls to players"
              className={`show-rolls-toggle__switch${showRollsToPlayers ? ' show-rolls-toggle__switch--on' : ''}`}
              onClick={toggleShowRolls}
            >
              <span className="show-rolls-toggle__knob" />
            </button>
          </label>
          <button
            type="button"
            className="btn btn--icon btn--sm"
            onClick={closeDiceRoller}
            aria-label="Close dice roller"
            title="Close dice roller"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      <div className="dice-roller-float__body">
        <DiceRoller />
      </div>

      <div
        className="dice-roller-float__resize"
        onMouseDown={handleResizeStart}
        role="separator"
        aria-orientation="horizontal"
        aria-label="Resize dice roller"
        title="Drag to resize"
      />
    </div>
  );
}

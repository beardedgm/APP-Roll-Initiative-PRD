import { useState, useEffect, useCallback, useRef } from 'react';
import useCombatStore from '../store/useCombatStore';

import { useCurrentUser } from '../api/useAuth';
import useUserDataStore from '../store/useUserDataStore';
import useUserDataInit from '../hooks/useUserDataInit';
import useEncounterCloudSetup from '../hooks/useEncounterCloudSetup';
import TrackerHeader from '../components/tracker/TrackerHeader';
import TurnControls from '../components/tracker/TurnControls';
import InitiativeList from '../components/tracker/InitiativeList';
import LeftPanel from '../components/tracker/LeftPanel';
import RightPanel from '../components/tracker/RightPanel';
import StartCombatModal from '../components/tracker/StartCombatModal';
import StatBlockModal from '../components/tracker/StatBlockModal';
import DiceToast from '../components/tracker/DiceToast';
import ShareLinkModal from '../components/tracker/ShareLinkModal';
import ImportMonsterModal from '../components/monsters/ImportMonsterModal';
import MonsterFormModal from '../components/monsters/MonsterFormModal';
import { migrateLocalStorageToStore } from '../utils/migrateLocalStorage';
import '../styles/tracker.css';

const DEFAULT_LEFT_WIDTH = 320;
const MIN_LEFT_WIDTH = 260;
const DEFAULT_RIGHT_WIDTH = 340;
const MIN_RIGHT_WIDTH = 280;

export default function Tracker() {
  const leftPanelRef = useRef(null);

  // ── Left panel resize ──
  const [leftWidth, setLeftWidth] = useState(() => {
    const saved = localStorage.getItem('tracker-left-width');
    return saved ? Math.max(MIN_LEFT_WIDTH, parseInt(saved)) : DEFAULT_LEFT_WIDTH;
  });
  const isResizingLeft = useRef(false);

  // ── Right panel resize ──
  const [rightWidth, setRightWidth] = useState(() => {
    const saved = localStorage.getItem('tracker-right-width');
    return saved ? Math.max(MIN_RIGHT_WIDTH, parseInt(saved)) : DEFAULT_RIGHT_WIDTH;
  });
  const isResizingRight = useRef(false);

  const undo = useCombatStore(s => s.undo);
  const redo = useCombatStore(s => s.redo);
  const addCombatant = useCombatStore(s => s.addCombatant);
  const rollDice = useCombatStore(s => s.rollDice);
  const combatState = useCombatStore(s => s.state);
  const nextTurn = useCombatStore(s => s.nextTurn);

  const { data: user } = useCurrentUser();
  const isAuthenticated = !!user;
  const dataLoaded = useUserDataStore(s => s._loaded);

  // Initialize user data from server + enable auto-sync
  useUserDataInit(isAuthenticated);

  // One-time migration from old localStorage keys
  useEffect(() => {
    if (dataLoaded) {
      migrateLocalStorageToStore();
    }
  }, [dataLoaded]);

  // Wire up live encounter cloud sync for subscribers
  useEncounterCloudSetup(user);

  // ── Keyboard shortcuts ──
  useEffect(() => {
    function handleKeyDown(e) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault();
        redo();
      }
      // Spacebar -> Next Turn (only during combat, only when no input is focused)
      if (e.key === ' ' && combatState === 'combat') {
        const tag = document.activeElement?.tagName?.toLowerCase();
        const isEditable = tag === 'input' || tag === 'textarea' || tag === 'select' || document.activeElement?.isContentEditable;
        if (!isEditable) {
          e.preventDefault();
          nextTurn();
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo, combatState, nextTurn]);

  const handleAddMonster = useCallback((monsterData) => {
    addCombatant({
      name: monsterData.name,
      maxHP: monsterData.hp || monsterData.maxHP,
      ac: monsterData.ac,
      initMod: monsterData.initiativeModifier ?? monsterData.initMod ?? 0,
      type: 'monster',
      quantity: 1,
      monsterSlug: monsterData.slug || monsterData.monsterSlug,
    });
  }, [addCombatant]);

  /** Roll dice from stat block notation like "2d6 + 5" */
  const handleStatBlockRoll = useCallback((notation) => {
    const m = notation.replace(/\s/g, '').match(/^(\d+)d(\d+)([+-]\d+)?$/);
    if (!m) return;
    const count = parseInt(m[1]);
    const sides = parseInt(m[2]);
    const modifier = m[3] ? parseInt(m[3]) : 0;
    rollDice({ sides, count, modifier, advantage: 'normal' });
  }, [rollDice]);

  /** Show stat block in the left panel + right panel content viewer */
  const handleViewStatBlock = useCallback((slug) => {
    leftPanelRef.current?.showStatBlock(slug);
  }, []);

  /** Left panel resize handle drag logic */
  const handleLeftResizeStart = useCallback((e) => {
    e.preventDefault();
    isResizingLeft.current = true;
    document.body.classList.add('is-resizing');

    const onMouseMove = (moveEvent) => {
      if (!isResizingLeft.current) return;
      const maxWidth = Math.floor(window.innerWidth * 0.4);
      const newWidth = Math.min(maxWidth, Math.max(MIN_LEFT_WIDTH, moveEvent.clientX - 16));
      setLeftWidth(newWidth);
    };

    const onMouseUp = () => {
      isResizingLeft.current = false;
      document.body.classList.remove('is-resizing');
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      setLeftWidth(w => { localStorage.setItem('tracker-left-width', String(w)); return w; });
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }, []);

  /** Right panel resize handle drag logic */
  const handleRightResizeStart = useCallback((e) => {
    e.preventDefault();
    isResizingRight.current = true;
    document.body.classList.add('is-resizing');

    const onMouseMove = (moveEvent) => {
      if (!isResizingRight.current) return;
      const maxWidth = Math.floor(window.innerWidth * 0.4);
      const newWidth = Math.min(maxWidth, Math.max(MIN_RIGHT_WIDTH, window.innerWidth - moveEvent.clientX - 16));
      setRightWidth(newWidth);
    };

    const onMouseUp = () => {
      isResizingRight.current = false;
      document.body.classList.remove('is-resizing');
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      setRightWidth(w => { localStorage.setItem('tracker-right-width', String(w)); return w; });
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }, []);

  return (
    <>
      <TrackerHeader />
      <main
        className="dm-main dm-main--3col"
        style={{ gridTemplateColumns: `${leftWidth}px 6px 1fr 6px ${rightWidth}px` }}
      >
        <section className="dm-col dm-col--left">
          <LeftPanel
            ref={leftPanelRef}
            onAddToEncounter={handleAddMonster}
          />
        </section>

        <div
          className="resize-handle resize-handle--left"
          onMouseDown={handleLeftResizeStart}
          role="separator"
          aria-orientation="vertical"
          aria-label="Resize left panel"
        />

        <section className="dm-col dm-col--center">
          <TurnControls />
          <InitiativeList onViewStatBlock={handleViewStatBlock} />
        </section>

        <div
          className="resize-handle resize-handle--right"
          onMouseDown={handleRightResizeStart}
          role="separator"
          aria-orientation="vertical"
          aria-label="Resize right panel"
        />

        <section className="dm-col dm-col--right">
          <RightPanel
            onRollDice={handleStatBlockRoll}
          />
        </section>
      </main>
      <StartCombatModal />
      <StatBlockModal
        onAddToEncounter={handleAddMonster}
        onRollDice={handleStatBlockRoll}
      />
      <ShareLinkModal />
      <ImportMonsterModal />
      <MonsterFormModal />
      <DiceToast />
    </>
  );
}

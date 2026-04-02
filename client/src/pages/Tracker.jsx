import { useState, useEffect, useCallback, useRef } from 'react';
import useCombatStore from '../store/useCombatStore';

import { useCurrentUser } from '../api/useAuth';
import { useUserData } from '../api/useUserData';
import useUserDataStore from '../store/useUserDataStore';
import useUserDataSync from '../hooks/useUserDataSync';
import TrackerHeader from '../components/tracker/TrackerHeader';
import TurnControls from '../components/tracker/TurnControls';
import InitiativeList from '../components/tracker/InitiativeList';
import DiceRoller from '../components/tracker/DiceRoller';
import LeftPanel from '../components/tracker/LeftPanel';
import StartCombatModal from '../components/tracker/StartCombatModal';
import StatBlockModal from '../components/tracker/StatBlockModal';
import DiceToast from '../components/tracker/DiceToast';
import ImportMonsterModal from '../components/monsters/ImportMonsterModal';
import MonsterFormModal from '../components/monsters/MonsterFormModal';
import { migrateLocalStorageToStore } from '../utils/migrateLocalStorage';
import '../styles/tracker.css';

const DEFAULT_LEFT_WIDTH = 320;
const MIN_LEFT_WIDTH = 260;

export default function Tracker() {
  const leftPanelRef = useRef(null);
  const [leftWidth, setLeftWidth] = useState(() => {
    const saved = localStorage.getItem('tracker-left-width');
    return saved ? Math.max(MIN_LEFT_WIDTH, parseInt(saved)) : DEFAULT_LEFT_WIDTH;
  });
  const isResizing = useRef(false);
  const undo = useCombatStore(s => s.undo);
  const redo = useCombatStore(s => s.redo);
  const addCombatant = useCombatStore(s => s.addCombatant);
  const rollDice = useCombatStore(s => s.rollDice);
  const combatState = useCombatStore(s => s.state);
  const nextTurn = useCombatStore(s => s.nextTurn);

  const { data: user } = useCurrentUser();
  const isAuthenticated = !!user;
  const { data: serverData } = useUserData(isAuthenticated);
  const loadFromServer = useUserDataStore(s => s.loadFromServer);
  const dataLoaded = useUserDataStore(s => s._loaded);

  // Load server data into store on first fetch
  useEffect(() => {
    if (serverData && !dataLoaded) {
      loadFromServer(serverData);
    }
  }, [serverData, dataLoaded, loadFromServer]);

  // One-time migration from old localStorage keys
  useEffect(() => {
    if (dataLoaded) {
      migrateLocalStorageToStore();
    }
  }, [dataLoaded]);

  // Enable auto-sync when authenticated
  useUserDataSync(isAuthenticated);

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
      // Spacebar → Next Turn (only during combat, only when no input is focused)
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

  /** Show stat block in the left-panel Monster Database */
  const handleViewStatBlock = useCallback((slug) => {
    leftPanelRef.current?.showStatBlock(slug);
  }, []);

  /** Resize handle drag logic */
  const handleResizeStart = useCallback((e) => {
    e.preventDefault();
    isResizing.current = true;
    document.body.classList.add('is-resizing');

    const onMouseMove = (moveEvent) => {
      if (!isResizing.current) return;
      const maxWidth = Math.floor(window.innerWidth * 0.5);
      const newWidth = Math.min(maxWidth, Math.max(MIN_LEFT_WIDTH, moveEvent.clientX - 16));
      setLeftWidth(newWidth);
    };

    const onMouseUp = () => {
      isResizing.current = false;
      document.body.classList.remove('is-resizing');
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      setLeftWidth(w => { localStorage.setItem('tracker-left-width', String(w)); return w; });
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }, []);

  return (
    <>
      <TrackerHeader />
      <main
        className="dm-main dm-main--3col"
        style={{ gridTemplateColumns: `${leftWidth}px 6px 1fr 300px` }}
      >
        <section className="dm-col dm-col--left">
          <LeftPanel
            ref={leftPanelRef}
            onRollDice={handleStatBlockRoll}
            onAddToEncounter={handleAddMonster}
          />
        </section>

        <div
          className="resize-handle"
          onMouseDown={handleResizeStart}
          role="separator"
          aria-orientation="vertical"
          aria-label="Resize left panel"
        />

        <section className="dm-col dm-col--center">
          <TurnControls />
          <InitiativeList onViewStatBlock={handleViewStatBlock} />
        </section>

        <section className="dm-col dm-col--right">
          <DiceRoller />
        </section>
      </main>
      <StartCombatModal />
      <StatBlockModal
        onAddToEncounter={handleAddMonster}
        onRollDice={handleStatBlockRoll}
      />
      <ImportMonsterModal />
      <MonsterFormModal />
      <DiceToast />
    </>
  );
}

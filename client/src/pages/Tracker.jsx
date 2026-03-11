import { useEffect, useCallback, useRef } from 'react';
import useCombatStore from '../store/useCombatStore';
import useUIStore from '../store/useUIStore';
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
import '../styles/tracker.css';

export default function Tracker() {
  const leftPanelRef = useRef(null);
  const undo = useCombatStore(s => s.undo);
  const redo = useCombatStore(s => s.redo);
  const addCombatant = useCombatStore(s => s.addCombatant);
  const rollDice = useCombatStore(s => s.rollDice);
  const combatState = useCombatStore(s => s.state);
  const combatants = useCombatStore(s => s.combatants);
  const openModal = useUIStore(s => s.openModal);

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
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo]);

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

  return (
    <>
      <TrackerHeader />
      <main className="dm-main dm-main--3col">
        <section className="dm-col dm-col--left">
          <LeftPanel
            ref={leftPanelRef}
            onRollDice={handleStatBlockRoll}
            onAddToEncounter={handleAddMonster}
          />
        </section>

        <section className="dm-col dm-col--center">
          <TurnControls />
          <InitiativeList onViewStatBlock={handleViewStatBlock} />
        </section>

        <section className="dm-col dm-col--right">
          {combatState === 'pre-combat' && (
            <div className="panel">
              <button
                className="btn btn--combat-start btn--full"
                disabled={combatants.length === 0}
                onClick={() => openModal('start-combat')}
              >
                &#9876; Start Combat
              </button>
            </div>
          )}
          <DiceRoller />
        </section>
      </main>
      <StartCombatModal />
      <StatBlockModal
        onAddToEncounter={handleAddMonster}
        onRollDice={handleStatBlockRoll}
      />
      <ImportMonsterModal />
      <MonsterFormModal onLocalSave={() => leftPanelRef.current?.refreshLocal()} />
      <DiceToast />
    </>
  );
}

import { useEffect, useCallback, useRef } from 'react';
import useCombatStore from '../store/useCombatStore';
import { useCurrentUser } from '../api/useAuth';
import useCloudSync from '../hooks/useCloudSync';
import useUIStore from '../store/useUIStore';
import TrackerHeader from '../components/tracker/TrackerHeader';
import TurnControls from '../components/tracker/TurnControls';
import AddCombatantModal from '../components/tracker/AddCombatantModal';
import InitiativeList from '../components/tracker/InitiativeList';
import DiceRoller from '../components/tracker/DiceRoller';
import MonsterDatabase from '../components/tracker/MonsterDatabase';
import StartCombatModal from '../components/tracker/StartCombatModal';
import StatBlockModal from '../components/tracker/StatBlockModal';
import ImportMonsterModal from '../components/monsters/ImportMonsterModal';
import MonsterFormModal from '../components/monsters/MonsterFormModal';
import '../styles/tracker.css';

export default function Tracker() {
  const monsterDbRef = useRef(null);
  const openModal = useUIStore(s => s.openModal);
  const undo = useCombatStore(s => s.undo);
  const redo = useCombatStore(s => s.redo);
  const addCombatant = useCombatStore(s => s.addCombatant);
  const rollDice = useCombatStore(s => s.rollDice);

  // Cloud sync: auto-syncs state to server when encounter has a cloudId
  const { data: user } = useCurrentUser();
  const isPremium = user && (user.subscriptionStatus === 'active' || user.role === 'admin');
  useCloudSync(!!isPremium);

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
    monsterDbRef.current?.showStatBlock(slug);
  }, []);

  return (
    <>
      <TrackerHeader />
      <main className="dm-main dm-main--3col">
        <section className="dm-col dm-col--left">
          <MonsterDatabase
            ref={monsterDbRef}
            onRollDice={handleStatBlockRoll}
            onAddToEncounter={handleAddMonster}
          />
        </section>

        <section className="dm-col dm-col--center">
          <button className="btn btn--primary btn--full" onClick={() => openModal('add-combatant')}>
            + Add Combatant
          </button>
          <TurnControls />
          <InitiativeList onViewStatBlock={handleViewStatBlock} />
        </section>

        <section className="dm-col dm-col--right">
          <DiceRoller />
        </section>
      </main>
      <AddCombatantModal />
      <StartCombatModal />
      <StatBlockModal
        onAddToEncounter={handleAddMonster}
        onRollDice={handleStatBlockRoll}
      />
      <ImportMonsterModal onLocalSave={() => monsterDbRef.current?.refreshLocal()} />
      <MonsterFormModal onLocalSave={() => monsterDbRef.current?.refreshLocal()} />
    </>
  );
}

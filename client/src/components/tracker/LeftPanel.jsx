import { useState, useRef, forwardRef, useImperativeHandle } from 'react';
import MonsterDatabase from './MonsterDatabase';
import CharacterLibrary from './CharacterLibrary';
import EncounterLibrary from './EncounterLibrary';

const TABS = [
  { id: '5e', label: '5E' },
  { id: 'pf2e', label: 'PF2E' },
  { id: 'characters', label: 'Characters' },
  { id: 'encounters', label: 'Encounters' },
];

const LeftPanel = forwardRef(function LeftPanel({ onRollDice, onAddToEncounter }, ref) {
  const [activeTab, setActiveTab] = useState('5e');
  const monsterDbRef5e = useRef(null);
  const monsterDbRefPf2e = useRef(null);

  useImperativeHandle(ref, () => ({
    showStatBlock(slug) {
      if (slug.startsWith('pf2e_')) {
        setActiveTab('pf2e');
        monsterDbRefPf2e.current?.showStatBlock(slug);
      } else {
        setActiveTab('5e');
        monsterDbRef5e.current?.showStatBlock(slug);
      }
    },
  }), []);

  return (
    <div className="left-panel">
      <div className="left-panel__tabs">
        {TABS.map(tab => (
          <button
            key={tab.id}
            className={`left-panel__tab${activeTab === tab.id ? ' left-panel__tab--active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className="left-panel__content">
        {activeTab === '5e' && (
          <MonsterDatabase ref={monsterDbRef5e} gameSystem="5e" onRollDice={onRollDice} onAddToEncounter={onAddToEncounter} />
        )}
        {activeTab === 'pf2e' && (
          <MonsterDatabase ref={monsterDbRefPf2e} gameSystem="pf2e" onRollDice={onRollDice} onAddToEncounter={onAddToEncounter} />
        )}
        {activeTab === 'characters' && <CharacterLibrary />}
        {activeTab === 'encounters' && <EncounterLibrary />}
      </div>
    </div>
  );
});

export default LeftPanel;

import { useState, useRef, forwardRef, useImperativeHandle } from 'react';
import MonsterDatabase from './MonsterDatabase';
import CharacterLibrary from './CharacterLibrary';
import EncounterLibrary from './EncounterLibrary';

const TABS = [
  { id: 'monsters', label: 'Monsters' },
  { id: 'characters', label: 'Characters' },
  { id: 'encounters', label: 'Encounters' },
];

const LeftPanel = forwardRef(function LeftPanel({ onRollDice, onAddToEncounter }, ref) {
  const [activeTab, setActiveTab] = useState('monsters');
  const monsterDbRef = useRef(null);

  useImperativeHandle(ref, () => ({
    showStatBlock(slug) {
      setActiveTab('monsters');
      monsterDbRef.current?.showStatBlock(slug);
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
        {activeTab === 'monsters' && (
          <MonsterDatabase ref={monsterDbRef} onRollDice={onRollDice} onAddToEncounter={onAddToEncounter} />
        )}
        {activeTab === 'characters' && <CharacterLibrary />}
        {activeTab === 'encounters' && <EncounterLibrary />}
      </div>
    </div>
  );
});

export default LeftPanel;

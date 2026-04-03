import { useState, useRef, forwardRef, useImperativeHandle } from 'react';
import useUIStore from '../../store/useUIStore';
import SystemToggle from './SystemToggle';
import CreatureList from './CreatureList';
import CharacterLibrary from './CharacterLibrary';
import EncounterLibrary from './EncounterLibrary';

const TABS = [
  { id: 'creatures', label: 'Creatures' },
  { id: 'spells', label: 'Spells' },
  { id: 'characters', label: 'Characters' },
  { id: 'encounters', label: 'Encounters' },
];

const LeftPanel = forwardRef(function LeftPanel({ onAddToEncounter }, ref) {
  const [activeTab, setActiveTab] = useState('creatures');
  const creatureListRef = useRef(null);

  const creaturesSystem = useUIStore(s => s.creaturesSystem);
  const setCreaturesSystem = useUIStore(s => s.setCreaturesSystem);
  const spellsSystem = useUIStore(s => s.spellsSystem);
  const setSpellsSystem = useUIStore(s => s.setSpellsSystem);
  const pushContent = useUIStore(s => s.pushContent);

  useImperativeHandle(ref, () => ({
    showStatBlock(slug) {
      setActiveTab('creatures');
      if (slug.startsWith('pf2e_')) {
        setCreaturesSystem('pf2e');
      } else {
        setCreaturesSystem('5e');
      }
      setTimeout(() => {
        creatureListRef.current?.selectCreature(slug);
      }, 0);
      pushContent({ type: 'creature', slug, name: slug });
    },
  }), [setCreaturesSystem, pushContent]);

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
        {activeTab === 'creatures' && (
          <>
            <SystemToggle value={creaturesSystem} onChange={setCreaturesSystem} />
            <CreatureList
              ref={creatureListRef}
              gameSystem={creaturesSystem}
              onAddToEncounter={onAddToEncounter}
            />
          </>
        )}
        {activeTab === 'spells' && (
          <>
            <SystemToggle value={spellsSystem} onChange={setSpellsSystem} />
            <div className="left-panel__placeholder">
              <p>Spells coming soon</p>
            </div>
          </>
        )}
        {activeTab === 'characters' && <CharacterLibrary />}
        {activeTab === 'encounters' && <EncounterLibrary />}
      </div>
    </div>
  );
});

export default LeftPanel;

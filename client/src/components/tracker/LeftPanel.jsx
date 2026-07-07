import { useState, useRef, forwardRef, useImperativeHandle } from 'react';
import useUIStore from '../../store/useUIStore';
import { useCurrentUser } from '../../api/useAuth';
import SubscriptionGate from '../layout/SubscriptionGate';
import SystemToggle from './SystemToggle';
import CreatureList from './CreatureList';
import SpellList from './SpellList';
import CharacterLibrary from './CharacterLibrary';
import EncounterLibrary from './EncounterLibrary';

const TABS = [
  { id: 'creatures', label: 'Creatures' },
  { id: 'spells', label: 'Spells' },
  { id: 'characters', label: 'Characters' },
  { id: 'encounters', label: 'Saved Encounters' },
];

const LeftPanel = forwardRef(function LeftPanel({ onAddToEncounter }, ref) {
  const [activeTab, setActiveTab] = useState('creatures');
  const creatureListRef = useRef(null);

  const { data: user } = useCurrentUser();
  const hasFullAccess = user && (user.subscriptionStatus === 'active' || user.role === 'owner');

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
              key={creaturesSystem}
              ref={creatureListRef}
              gameSystem={creaturesSystem}
              onAddToEncounter={onAddToEncounter}
            />
          </>
        )}
        {activeTab === 'spells' && (
          <>
            <SystemToggle value={spellsSystem} onChange={setSpellsSystem} />
            <SpellList key={spellsSystem} gameSystem={spellsSystem} />
          </>
        )}
        {activeTab === 'characters' && (
          hasFullAccess ? <CharacterLibrary /> : <SubscriptionGate message="Save your player characters for quick re-use across sessions." />
        )}
        {activeTab === 'encounters' && (
          hasFullAccess ? <EncounterLibrary /> : <SubscriptionGate message="Save and load encounter presets across devices." />
        )}
      </div>
    </div>
  );
});

export default LeftPanel;

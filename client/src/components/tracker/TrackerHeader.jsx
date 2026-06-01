import { useState } from 'react';
import { Swords, Undo2, Redo2, Monitor, Share2, Trash2, User, LogIn, HelpCircle, Dices } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import useCombatStore from '../../store/useCombatStore';
import { useShallow } from 'zustand/react/shallow';
import { useCurrentUser } from '../../api/useAuth';
import useUIStore from '../../store/useUIStore';
import SyncIndicator from './SyncIndicator';
import ProfilePanel from './ProfilePanel';

export default function TrackerHeader() {
  const [profileOpen, setProfileOpen] = useState(false);
  const { data: user } = useCurrentUser();
  const navigate = useNavigate();
  const openModal = useUIStore(s => s.openModal);
  const diceRollerOpen = useUIStore(s => s.diceRollerOpen);
  const toggleDiceRoller = useUIStore(s => s.toggleDiceRoller);

  const {
    undoLen, redoLen,
    undo, redo, resetEncounter,
  } = useCombatStore(useShallow(s => ({
    undoLen: s.undoStack.length,
    redoLen: s.redoStack.length,
    undo: s.undo,
    redo: s.redo,
    resetEncounter: s.resetEncounter,
  })));

  function handleReset() {
    if (!window.confirm('Reset encounter? Monsters and NPCs will be removed. Players are kept.')) return;
    resetEncounter();
  }

  function handleOpenPlayerView() {
    window.open('/play', 'playerView', 'width=1280,height=720,menubar=no,toolbar=no,location=no,status=no');
  }

  return (
    <>
    <header className="dm-header">
      <div className="dm-header__left">
        <h1><Swords size={18} /> Roll Initiative</h1>
      </div>

      <div className="dm-header__right">
        <button className="btn btn--icon" disabled={undoLen === 0} onClick={undo} title="Undo (Ctrl+Z)">
          <Undo2 size={16} />
        </button>
        <button className="btn btn--icon" disabled={redoLen === 0} onClick={redo} title="Redo (Ctrl+Y)">
          <Redo2 size={16} />
        </button>

        <button
          className={`btn btn--icon${diceRollerOpen ? ' btn--icon-active' : ''}`}
          onClick={toggleDiceRoller}
          aria-pressed={diceRollerOpen}
          title="Dice roller"
        >
          <Dices size={16} />
        </button>

        <SyncIndicator />

        <span className="header-divider" />

        <button className="btn btn--icon" onClick={handleOpenPlayerView} title="Open player view">
          <Monitor size={16} />
        </button>
        {user && (
          <button className="btn btn--icon" onClick={() => openModal('share-link')} title="Share player view link">
            <Share2 size={16} />
          </button>
        )}
        <button className="btn btn--icon btn--icon-danger" onClick={handleReset} title="Reset encounter">
          <Trash2 size={16} />
        </button>

        <button className="btn btn--icon" onClick={() => navigate('/help')} title="Help">
          <HelpCircle size={16} />
        </button>

        <span className="header-divider" />
        {user ? (
          <button className="btn btn--icon" onClick={() => setProfileOpen(true)} title="Profile">
            <User size={16} />
          </button>
        ) : (
          <button className="btn btn--icon" onClick={() => navigate('/login')} title="Log in">
            <LogIn size={16} />
          </button>
        )}
      </div>
    </header>
    {user && <ProfilePanel open={profileOpen} onClose={() => setProfileOpen(false)} />}
  </>
  );
}

import { useState } from 'react';
import { Swords, Undo2, Redo2, Monitor, Trash2, User } from 'lucide-react';
import useCombatStore from '../../store/useCombatStore';
import { useShallow } from 'zustand/react/shallow';
import { useCurrentUser } from '../../api/useAuth';
import SyncIndicator from './SyncIndicator';
import ProfilePanel from './ProfilePanel';

export default function TrackerHeader() {
  const [profileOpen, setProfileOpen] = useState(false);
  const { data: user } = useCurrentUser();
  const displayName = user?.displayName || user?.email?.split('@')[0] || 'Account';

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
        <h1><Swords size={18} /> Initiative Tracker</h1>
      </div>

      <div className="dm-header__right">
        <button className="btn btn--icon" disabled={undoLen === 0} onClick={undo} title="Undo (Ctrl+Z)">
          <Undo2 size={16} /> Undo
        </button>
        <button className="btn btn--icon" disabled={redoLen === 0} onClick={redo} title="Redo (Ctrl+Y)">
          <Redo2 size={16} /> Redo
        </button>

        <SyncIndicator />

        <span className="header-divider" />

        <button className="btn btn--secondary" onClick={handleOpenPlayerView} title="Open player view">
          <Monitor size={16} /> Player View
        </button>
        <button className="btn btn--danger" onClick={handleReset} title="Reset the entire encounter">
          <Trash2 size={16} /> Reset
        </button>

        {user && (
          <>
            <span className="header-divider" />
            <button className="btn btn--icon" onClick={() => setProfileOpen(true)} title="Profile">
              <User size={16} /> {displayName}
            </button>
          </>
        )}
      </div>
    </header>
    {user && <ProfilePanel open={profileOpen} onClose={() => setProfileOpen(false)} />}
  </>
  );
}

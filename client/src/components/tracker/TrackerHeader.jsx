import useCombatStore from '../../store/useCombatStore';
import { useShallow } from 'zustand/react/shallow';
import useUserDataStore from '../../store/useUserDataStore';

export default function TrackerHeader() {
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

  const syncStatus = useUserDataStore(s => s.syncStatus);

  function handleReset() {
    if (!window.confirm('Reset encounter? Monsters and NPCs will be removed. Players are kept.')) return;
    resetEncounter();
  }

  function handleOpenPlayerView() {
    window.open('/play', 'playerView', 'width=1280,height=720,menubar=no,toolbar=no,location=no,status=no');
  }

  return (
    <header className="dm-header">
      <div className="dm-header__left">
        <h1>&#9876; Initiative Tracker</h1>
      </div>

      <div className="dm-header__right">
        <button className="btn btn--icon" disabled={undoLen === 0} onClick={undo} title="Undo (Ctrl+Z)">
          &#8617; Undo
        </button>
        <button className="btn btn--icon" disabled={redoLen === 0} onClick={redo} title="Redo (Ctrl+Y)">
          &#8618; Redo
        </button>

        {syncStatus !== 'idle' && (
          <>
            <span className="header-divider" />
            <span className={`sync-indicator sync-indicator--${syncStatus}`}>
              {syncStatus === 'syncing' ? 'Saving...' : syncStatus === 'synced' ? 'Saved' : syncStatus === 'error' ? 'Sync error' : ''}
            </span>
          </>
        )}

        <span className="header-divider" />

        <button className="btn btn--secondary" onClick={handleOpenPlayerView} title="Open player view">
          &#128498; Player View
        </button>
        <button className="btn btn--danger" onClick={handleReset} title="Reset the entire encounter">
          &#128465; Reset
        </button>
      </div>
    </header>
  );
}

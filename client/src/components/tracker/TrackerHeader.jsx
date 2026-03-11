import { useCallback } from 'react';
import useCombatStore from '../../store/useCombatStore';
import { useShallow } from 'zustand/react/shallow';
import { useCurrentUser } from '../../api/useAuth';
import { useCreateEncounter } from '../../api/useEncounters';

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

  const { data: user } = useCurrentUser();
  const isPremium = user && (user.subscriptionStatus === 'active' || user.role === 'admin');
  const createEncounter = useCreateEncounter();

  function handleReset() {
    if (!window.confirm('Reset encounter? Monsters and NPCs will be removed. Players are kept.')) return;
    resetEncounter();
  }

  const handleSync = useCallback(async () => {
    const store = useCombatStore.getState();
    const saveName = window.prompt('Save encounter as:', store.name || 'New Encounter');
    if (!saveName?.trim()) return;
    try {
      await createEncounter.mutateAsync({
        name: saveName.trim(),
        state: store.state,
        currentRound: store.currentRound,
        activeCreatureId: store.activeCreatureId,
        combatants: store.combatants,
        diceHistory: store.diceHistory,
      });
    } catch {
      window.alert('Cloud save failed. Please try again.');
    }
  }, [createEncounter]);

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

        <span className="header-divider" />

        {isPremium && (
          <>
            <button className="btn btn--icon" onClick={handleSync} disabled={createEncounter.isPending} title="Save encounter to cloud">
              &#9729; {createEncounter.isPending ? 'Saving...' : 'Sync'}
            </button>
            <span className="header-divider" />
          </>
        )}

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

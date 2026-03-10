import { useRef, useEffect } from 'react';
import useCombatStore from '../store/useCombatStore';
import useDynamicSizing from '../hooks/useDynamicSizing';
import InitiativeItem from '../components/player/InitiativeItem';
import '../styles/player.css';

export default function PlayerView() {
  const combatState = useCombatStore(s => s.state);
  const combatants = useCombatStore(s => s.combatants);
  const activeCreatureId = useCombatStore(s => s.activeCreatureId);
  const currentRound = useCombatStore(s => s.currentRound);
  const listRef = useRef(null);
  const updateSizing = useDynamicSizing(listRef);

  // Re-run sizing when combatants change
  useEffect(() => {
    requestAnimationFrame(updateSizing);
  }, [combatants, combatState, updateSizing]);

  // Pre-combat: show PCs only
  if (combatState === 'pre-combat') {
    const pcs = combatants.filter(c => c.type === 'player');

    if (pcs.length === 0) {
      return (
        <div className="player-wrapper">
          <header className="player-header">
            <h1 className="player-header__title">&#9876; Initiative Tracker</h1>
            <span className="player-header__round" />
          </header>
          <main className="player-main">
            <div className="player-waiting">
              <div className="player-waiting__icon">&#9876;</div>
              <p className="player-waiting__text">GM is preparing the encounter...</p>
            </div>
          </main>
          <footer className="player-footer">Initiative Tracker &mdash; Player View</footer>
        </div>
      );
    }

    return (
      <div className="player-wrapper">
        <header className="player-header">
          <h1 className="player-header__title">&#9876; Initiative Tracker</h1>
          <span className="player-header__round">Preparing...</span>
        </header>
        <main className="player-main">
          <ol className="initiative-list" ref={listRef}>
            <li className="initiative-item initiative-item--preparing">
              <span className="initiative-item__preparing-text">&#9876; GM is preparing the encounter...</span>
            </li>
            {pcs.map(pc => (
              <li key={pc.id} className="initiative-item type-border-player">
                <div className="initiative-item__left">
                  <span className="initiative-item__name">{pc.name}</span>
                </div>
                <span className="type-badge player">PC</span>
              </li>
            ))}
          </ol>
        </main>
        <footer className="player-footer">Initiative Tracker &mdash; Player View</footer>
      </div>
    );
  }

  // Combat
  if (combatants.length === 0) {
    return (
      <div className="player-wrapper">
        <header className="player-header">
          <h1 className="player-header__title">&#9876; Initiative Tracker</h1>
          <span className="player-header__round" />
        </header>
        <main className="player-main">
          <div className="player-waiting">
            <div className="player-waiting__icon">&#9876;</div>
            <p className="player-waiting__text">Combat in progress...</p>
          </div>
        </main>
        <footer className="player-footer">Initiative Tracker &mdash; Player View</footer>
      </div>
    );
  }

  return (
    <div className="player-wrapper">
      <header className="player-header">
        <h1 className="player-header__title">&#9876; Initiative Tracker</h1>
        <span className="player-header__round">Round {currentRound}</span>
      </header>
      <main className="player-main">
        <ol className="initiative-list" ref={listRef}>
          {combatants.map(c => (
            <InitiativeItem
              key={c.id}
              combatant={c}
              isActive={c.id === activeCreatureId}
            />
          ))}
        </ol>
      </main>
      <footer className="player-footer">Initiative Tracker &mdash; Player View</footer>
    </div>
  );
}

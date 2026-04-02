import { useRef, useEffect, useMemo } from 'react';
import { Swords } from 'lucide-react';
import useDynamicSizing from '../../hooks/useDynamicSizing';
import InitiativeItem from './InitiativeItem';
import '../../styles/player.css';

export default function PlayerViewLayout({
  encounter,
  isLoading,
  error,
  errorMessage,
  showShareInfo,
}) {
  const listRef = useRef(null);
  const updateSizing = useDynamicSizing(listRef);

  const footerLabel = showShareInfo
    ? 'Initiative Tracker \u2014 Shared Player View'
    : 'Initiative Tracker \u2014 Player View';

  const combatState = encounter?.state;
  const combatants = useMemo(() => encounter?.combatants || [], [encounter?.combatants]);
  const activeCreatureId = encounter?.activeCreatureId;
  const currentRound = encounter?.currentRound;
  const name = encounter?.name;

  const headerTitle = showShareInfo && name ? name : 'Initiative Tracker';

  useEffect(() => {
    requestAnimationFrame(updateSizing);
  }, [combatants, combatState, updateSizing]);

  // Loading state
  if (isLoading) {
    return (
      <div className="player-wrapper">
        <header className="player-header">
          <h1 className="player-header__title"><Swords /> Initiative Tracker</h1>
          <span className="player-header__round" />
        </header>
        <main className="player-main">
          <div className="player-waiting">
            <div className="player-waiting__icon"><Swords /></div>
            <p className="player-waiting__text">Connecting to encounter...</p>
          </div>
        </main>
        <footer className="player-footer">{footerLabel}</footer>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="player-wrapper">
        <header className="player-header">
          <h1 className="player-header__title"><Swords /> Initiative Tracker</h1>
          <span className="player-header__round" />
        </header>
        <main className="player-main">
          <div className="player-waiting">
            <div className="player-waiting__icon"><Swords /></div>
            <p className="player-waiting__text">
              {errorMessage || 'Encounter not found or link has expired.'}
            </p>
          </div>
        </main>
        <footer className="player-footer">{footerLabel}</footer>
      </div>
    );
  }

  // Pre-combat: show PCs only
  if (combatState === 'pre-combat') {
    const pcs = combatants.filter(c => c.type === 'player');

    if (!showShareInfo && pcs.length === 0) {
      return (
        <div className="player-wrapper">
          <header className="player-header">
            <h1 className="player-header__title"><Swords /> Initiative Tracker</h1>
            <span className="player-header__round" />
          </header>
          <main className="player-main">
            <div className="player-waiting">
              <div className="player-waiting__icon"><Swords /></div>
              <p className="player-waiting__text">GM is preparing the encounter...</p>
            </div>
          </main>
          <footer className="player-footer">{footerLabel}</footer>
        </div>
      );
    }

    return (
      <div className="player-wrapper">
        <header className="player-header">
          <h1 className="player-header__title"><Swords /> {headerTitle}</h1>
          <span className="player-header__round">Preparing...</span>
        </header>
        <main className="player-main">
          <ol className="initiative-list" ref={listRef}>
            <li className="initiative-item initiative-item--preparing">
              <span className="initiative-item__preparing-text"><Swords /> GM is preparing the encounter...</span>
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
        <footer className="player-footer">{footerLabel}</footer>
      </div>
    );
  }

  // Combat: empty combatants
  if (combatants.length === 0) {
    return (
      <div className="player-wrapper">
        <header className="player-header">
          <h1 className="player-header__title"><Swords /> {headerTitle}</h1>
          <span className="player-header__round" />
        </header>
        <main className="player-main">
          <div className="player-waiting">
            <div className="player-waiting__icon"><Swords /></div>
            <p className="player-waiting__text">Combat in progress...</p>
          </div>
        </main>
        <footer className="player-footer">{footerLabel}</footer>
      </div>
    );
  }

  // Active combat
  return (
    <div className="player-wrapper">
      <header className="player-header">
        <h1 className="player-header__title"><Swords /> {headerTitle}</h1>
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
      <footer className="player-footer">{footerLabel}</footer>
    </div>
  );
}

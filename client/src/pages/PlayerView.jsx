import useCombatStore from '../store/useCombatStore';
import PlayerViewLayout from '../components/player/PlayerViewLayout';
import SEO from '../components/layout/SEO';

export default function PlayerView() {
  const combatState = useCombatStore(s => s.state);
  const combatants = useCombatStore(s => s.combatants);
  const activeCreatureId = useCombatStore(s => s.activeCreatureId);
  const currentRound = useCombatStore(s => s.currentRound);
  const latestSharedRoll = useCombatStore(s => s.latestSharedRoll);

  const encounter = {
    state: combatState,
    combatants,
    activeCreatureId,
    currentRound,
  };

  return (
    <>
    <SEO title="Player View | Roll Initiative" description="Player view for Roll Initiative combat tracker." path="/play" noindex />
    <PlayerViewLayout
      encounter={encounter}
      isLoading={false}
      error={false}
      latestSharedRoll={latestSharedRoll}
    />
    </>
  );
}

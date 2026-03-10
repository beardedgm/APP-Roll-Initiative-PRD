import useCombatStore from '../store/useCombatStore';
import PlayerViewLayout from '../components/player/PlayerViewLayout';

export default function PlayerView() {
  const combatState = useCombatStore(s => s.state);
  const combatants = useCombatStore(s => s.combatants);
  const activeCreatureId = useCombatStore(s => s.activeCreatureId);
  const currentRound = useCombatStore(s => s.currentRound);

  const encounter = {
    state: combatState,
    combatants,
    activeCreatureId,
    currentRound,
  };

  return (
    <PlayerViewLayout
      encounter={encounter}
      isLoading={false}
      error={false}
    />
  );
}

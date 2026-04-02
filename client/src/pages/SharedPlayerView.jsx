import { useParams } from 'react-router-dom';
import { useSharedEncounter } from '../api/useEncounters';
import PlayerViewLayout from '../components/player/PlayerViewLayout';

export default function SharedPlayerView() {
  const { code } = useParams();
  const { data: encounter, isLoading, isError } = useSharedEncounter(code);

  return (
    <PlayerViewLayout
      encounter={encounter}
      isLoading={isLoading}
      error={!isLoading && (isError || !encounter)}
      errorMessage="Encounter not found or link has expired."
      showShareInfo
      shareCode={code}
      latestSharedRoll={encounter?.latestSharedRoll}
    />
  );
}

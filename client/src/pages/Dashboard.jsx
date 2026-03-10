import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCurrentUser } from '../api/useAuth';
import {
  useEncounters,
  useCreateEncounter,
  useDeleteEncounter,
  useShareEncounter,
  useUnshareEncounter,
} from '../api/useEncounters';
import useCombatStore from '../store/useCombatStore';
import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';
import '../styles/marketing.css';

export default function Dashboard() {
  const navigate = useNavigate();
  const { data: user } = useCurrentUser();
  const { data: encounters, isLoading } = useEncounters();
  const createEncounter = useCreateEncounter();
  const deleteEncounter = useDeleteEncounter();
  const shareEncounter = useShareEncounter();
  const unshareEncounter = useUnshareEncounter();
  const [copiedId, setCopiedId] = useState(null);

  const loadSnapshot = useCombatStore(s => s.loadSnapshot);

  const handleSaveCurrent = useCallback(async () => {
    const state = useCombatStore.getState();
    await createEncounter.mutateAsync({
      name: state.name,
      state: state.state,
      currentRound: state.currentRound,
      activeCreatureId: state.activeCreatureId,
      combatants: state.combatants,
      diceHistory: state.diceHistory,
    });
  }, [createEncounter]);

  const handleLoad = useCallback(async (encounter) => {
    // Fetch full encounter data and load into store
    const { data } = await (await import('../api/axiosInstance')).default.get(`/encounters/${encounter._id}`);
    const enc = data.encounter;
    loadSnapshot({
      id: enc._id,
      cloudId: enc._id,
      shareCode: enc.shareCode || null,
      name: enc.name,
      state: enc.state,
      currentRound: enc.currentRound,
      activeCreatureId: enc.activeCreatureId,
      combatants: enc.combatants,
      diceHistory: enc.diceHistory || [],
    });
    navigate('/tracker');
  }, [loadSnapshot, navigate]);

  const handleDelete = useCallback(async (id) => {
    if (!window.confirm('Delete this encounter? This cannot be undone.')) return;
    await deleteEncounter.mutateAsync(id);
  }, [deleteEncounter]);

  const handleShare = useCallback(async (id) => {
    const result = await shareEncounter.mutateAsync(id);
    const url = `${window.location.origin}/play/${result.shareCode}`;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      // clipboard not available — silent fail
    }
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }, [shareEncounter]);

  const handleUnshare = useCallback(async (id) => {
    await unshareEncounter.mutateAsync(id);
  }, [unshareEncounter]);

  if (!user) {
    return (
      <>
        <Navbar />
        <main className="auth-page">
          <div className="auth-card">
            <h1 className="auth-card__title">Dashboard</h1>
            <p className="auth-card__subtitle">Please log in to access your saved encounters.</p>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Navbar />
      <main className="dashboard-page">
        <div className="dashboard-container">
          <div className="dashboard-header">
            <h1 className="dashboard-header__title">Saved Encounters</h1>
            <button
              className="btn btn--primary"
              onClick={handleSaveCurrent}
              disabled={createEncounter.isPending}
            >
              {createEncounter.isPending ? 'Saving...' : 'Save Current Encounter'}
            </button>
          </div>

          {isLoading ? (
            <p className="dashboard-loading">Loading encounters...</p>
          ) : !encounters || encounters.length === 0 ? (
            <div className="dashboard-empty">
              <p>No saved encounters yet.</p>
              <p>Set up an encounter in the tracker, then come back here to save it to the cloud.</p>
            </div>
          ) : (
            <div className="dashboard-grid">
              {encounters.map(enc => (
                <div key={enc._id} className="encounter-card">
                  <div className="encounter-card__header">
                    <h3 className="encounter-card__name">{enc.name}</h3>
                    <span className={`encounter-card__badge encounter-card__badge--${enc.state}`}>
                      {enc.state === 'combat' ? `Round ${enc.currentRound}` : 'Pre-Combat'}
                    </span>
                  </div>
                  <p className="encounter-card__meta">
                    {enc.combatantCount} combatant{enc.combatantCount !== 1 ? 's' : ''}
                    {' \u2022 '}
                    Updated {new Date(enc.updatedAt).toLocaleDateString()}
                  </p>
                  <div className="encounter-card__actions">
                    <button
                      className="btn btn--small btn--primary"
                      onClick={() => handleLoad(enc)}
                    >
                      Load
                    </button>
                    {enc.shareCode ? (
                      <button
                        className="btn btn--small btn--outline"
                        onClick={() => handleUnshare(enc._id)}
                      >
                        Unshare
                      </button>
                    ) : (
                      <button
                        className="btn btn--small btn--outline"
                        onClick={() => handleShare(enc._id)}
                      >
                        {copiedId === enc._id ? 'Copied!' : 'Share'}
                      </button>
                    )}
                    <button
                      className="btn btn--small btn--danger"
                      onClick={() => handleDelete(enc._id)}
                      disabled={deleteEncounter.isPending}
                    >
                      Delete
                    </button>
                  </div>
                  {enc.shareCode && (
                    <p className="encounter-card__share-url">
                      Player link: /play/{enc.shareCode}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}

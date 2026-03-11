import { useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCurrentUser } from '../api/useAuth';
import { useUserData } from '../api/useUserData';
import useCombatStore from '../store/useCombatStore';
import useUserDataStore from '../store/useUserDataStore';
import useUserDataSync from '../hooks/useUserDataSync';
import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';
import '../styles/marketing.css';

export default function Dashboard() {
  const navigate = useNavigate();
  const { data: user } = useCurrentUser();
  const isAuthenticated = !!user;
  const { data: serverData } = useUserData(isAuthenticated);
  const loadFromServer = useUserDataStore(s => s.loadFromServer);
  const dataLoaded = useUserDataStore(s => s._loaded);

  // Load server data into store on first fetch
  useEffect(() => {
    if (serverData && !dataLoaded) {
      loadFromServer(serverData);
    }
  }, [serverData, dataLoaded, loadFromServer]);

  // Enable auto-sync when authenticated
  useUserDataSync(isAuthenticated);

  const encounterPresets = useUserDataStore(s => s.encounterPresets);
  const addEncounterPreset = useUserDataStore(s => s.addEncounterPreset);
  const removeEncounterPreset = useUserDataStore(s => s.removeEncounterPreset);
  const syncStatus = useUserDataStore(s => s.syncStatus);

  const loadSnapshot = useCombatStore(s => s.loadSnapshot);

  const handleSaveCurrent = useCallback(() => {
    const state = useCombatStore.getState();
    const name = window.prompt('Save encounter as:', state.name || 'New Encounter');
    if (!name?.trim()) return;
    addEncounterPreset({
      name: name.trim(),
      combatants: state.combatants,
      state: state.state,
      currentRound: state.currentRound,
      activeCreatureId: state.activeCreatureId,
      diceHistory: state.diceHistory,
    });
  }, [addEncounterPreset]);

  const handleLoad = useCallback((preset) => {
    loadSnapshot({
      name: preset.name,
      combatants: preset.combatants,
      state: preset.state,
      currentRound: preset.currentRound,
      activeCreatureId: preset.activeCreatureId,
      diceHistory: preset.diceHistory || [],
    });
    navigate('/tracker');
  }, [loadSnapshot, navigate]);

  const handleDelete = useCallback((id) => {
    if (!window.confirm('Delete this encounter? This cannot be undone.')) return;
    removeEncounterPreset(id);
  }, [removeEncounterPreset]);

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
            <div className="dashboard-header__actions">
              <button
                className="btn btn--primary"
                onClick={handleSaveCurrent}
              >
                Save Current Encounter
              </button>
              {syncStatus !== 'idle' && (
                <span className={`sync-indicator sync-indicator--${syncStatus}`}>
                  {syncStatus === 'syncing' ? 'Saving...' : syncStatus === 'synced' ? 'Saved' : 'Sync error'}
                </span>
              )}
            </div>
          </div>

          {encounterPresets.length === 0 ? (
            <div className="dashboard-empty">
              <p>No saved encounters yet.</p>
              <p>Set up an encounter in the tracker, then come back here to save it.</p>
            </div>
          ) : (
            <div className="dashboard-grid">
              {encounterPresets.map(preset => (
                <div key={preset.id} className="encounter-card">
                  <div className="encounter-card__header">
                    <h3 className="encounter-card__name">{preset.name}</h3>
                    <span className={`encounter-card__badge encounter-card__badge--${preset.state || 'pre-combat'}`}>
                      {preset.state === 'combat' ? `Round ${preset.currentRound}` : 'Pre-Combat'}
                    </span>
                  </div>
                  <p className="encounter-card__meta">
                    {preset.combatants?.length || 0} combatant{(preset.combatants?.length || 0) !== 1 ? 's' : ''}
                    {preset.createdAt && (
                      <>
                        {' \u2022 '}
                        Saved {new Date(preset.createdAt).toLocaleDateString()}
                      </>
                    )}
                  </p>
                  <div className="encounter-card__actions">
                    <button
                      className="btn btn--small btn--primary"
                      onClick={() => handleLoad(preset)}
                    >
                      Load
                    </button>
                    <button
                      className="btn btn--small btn--danger"
                      onClick={() => handleDelete(preset.id)}
                    >
                      Delete
                    </button>
                  </div>
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

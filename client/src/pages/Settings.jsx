import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCurrentUser, useChangePassword, useUpdateProfile, useDeleteAccount } from '../api/useAuth';
import { useBillingStatus, useCreatePortalSession } from '../api/useSubscription';
import api from '../api/axiosInstance';
import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';
import '../styles/marketing.css';

export default function Settings() {
  const navigate = useNavigate();
  const { data: user } = useCurrentUser();
  const { data: billing } = useBillingStatus();
  const portalSession = useCreatePortalSession();
  const changePassword = useChangePassword();
  const updateProfile = useUpdateProfile();
  const deleteAccount = useDeleteAccount();
  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '' });
  const [pwMsg, setPwMsg] = useState('');
  const [pwError, setPwError] = useState('');
  const [editingName, setEditingName] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [nameMsg, setNameMsg] = useState('');
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState('');

  async function handleChangePassword(e) {
    e.preventDefault();
    setPwMsg('');
    setPwError('');
    try {
      await changePassword.mutateAsync(pwForm);
      setPwMsg('Password updated successfully.');
      setPwForm({ currentPassword: '', newPassword: '' });
    } catch (err) {
      setPwError(err.response?.data?.error || 'Failed to change password');
    }
  }

  async function handleUpdateName(e) {
    e.preventDefault();
    setNameMsg('');
    try {
      await updateProfile.mutateAsync({ displayName });
      setNameMsg('Display name updated.');
      setEditingName(false);
    } catch (err) {
      setNameMsg(err.response?.data?.error || 'Failed to update name');
    }
  }

  async function handleExportData() {
    setExportError('');
    setExporting(true);
    try {
      const response = await api.get('/auth/export', { responseType: 'blob' });
      const url = URL.createObjectURL(new Blob([response.data], { type: 'application/json' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = 'roll-initiative-export.json';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      // responseType: 'blob' means err.response.data is a Blob, not JSON —
      // read it out explicitly so we can surface the server's error message.
      let message = 'Export failed. Please try again.';
      const blob = err.response?.data;
      if (blob && typeof blob.text === 'function') {
        try {
          const parsed = JSON.parse(await blob.text());
          if (parsed?.error) message = parsed.error;
        } catch { /* not JSON — keep generic message */ }
      } else if (err.response?.data?.error) {
        message = err.response.data.error;
      }
      setExportError(message);
    } finally {
      setExporting(false);
    }
  }

  async function handleDeleteAccount(e) {
    e.preventDefault();
    setDeleteError('');
    try {
      await deleteAccount.mutateAsync({ password: deletePassword });
      navigate('/');
    } catch (err) {
      setDeleteError(err.response?.data?.error || 'Failed to delete account');
    }
  }

  if (!user) return null;

  return (
    <>
      <Navbar />
      <main className="settings-page">
        <div className="settings-container">
          <h1 className="settings-title">Account Settings</h1>

          {/* Profile */}
          <section className="settings-section">
            <h2 className="settings-section__title">Profile</h2>
            {nameMsg && <div className="settings-msg settings-msg--success">{nameMsg}</div>}
            <div className="settings-field">
              <span className="settings-field__label">Display Name</span>
              {editingName ? (
                <form onSubmit={handleUpdateName} className="settings__inline-form">
                  <input
                    type="text"
                    className="auth-form__input"
                    value={displayName}
                    onChange={e => setDisplayName(e.target.value)}
                    required
                    maxLength={50}
                  />
                  <button type="submit" className="btn btn--primary" disabled={updateProfile.isPending}>
                    {updateProfile.isPending ? 'Saving...' : 'Save'}
                  </button>
                  <button type="button" className="btn btn--outline" onClick={() => setEditingName(false)}>
                    Cancel
                  </button>
                </form>
              ) : (
                <span className="settings-field__value">
                  {user.displayName}{' '}
                  <button
                    className="btn btn--outline btn--small settings__edit-btn"
                    onClick={() => { setDisplayName(user.displayName); setEditingName(true); setNameMsg(''); }}
                  >
                    Edit
                  </button>
                </span>
              )}
            </div>
            <div className="settings-field">
              <span className="settings-field__label">Email</span>
              <span className="settings-field__value">{user.email}</span>
            </div>
          </section>

          {/* Subscription */}
          <section className="settings-section">
            <h2 className="settings-section__title">Subscription</h2>
            <div className="settings-field">
              <span className="settings-field__label">Status</span>
              <span className={`settings-field__value settings-status--${billing?.subscriptionStatus || 'none'}`}>
                {billing?.subscriptionStatus === 'active' ? 'Active'
                  : billing?.subscriptionStatus === 'past_due' ? 'Past Due'
                  : billing?.subscriptionStatus === 'canceled' ? 'Canceled'
                  : user.role === 'owner' ? 'Owner (full access)' : 'Free'}
              </span>
            </div>
            {billing?.currentPeriodEnd && (
              <div className="settings-field">
                <span className="settings-field__label">Current Period Ends</span>
                <span className="settings-field__value">
                  {new Date(billing.currentPeriodEnd).toLocaleDateString()}
                </span>
              </div>
            )}
            {billing?.subscriptionStatus === 'active' || billing?.subscriptionStatus === 'past_due' ? (
              <button
                className="btn btn--outline"
                onClick={() => portalSession.mutate()}
                disabled={portalSession.isPending}
              >
                {portalSession.isPending ? 'Redirecting...' : 'Manage Subscription'}
              </button>
            ) : user.role !== 'owner' ? (
              <a href="/pricing" className="btn btn--primary">Upgrade to Premium</a>
            ) : null}
          </section>

          {/* Change Password */}
          <section className="settings-section">
            <h2 className="settings-section__title">Change Password</h2>
            {pwMsg && <div className="settings-msg settings-msg--success">{pwMsg}</div>}
            {pwError && <div className="settings-msg settings-msg--error">{pwError}</div>}
            <form onSubmit={handleChangePassword} className="auth-form">
              <label className="auth-form__label">
                Current Password
                <input
                  type="password"
                  className="auth-form__input"
                  value={pwForm.currentPassword}
                  onChange={e => setPwForm(f => ({ ...f, currentPassword: e.target.value }))}
                  required
                  autoComplete="current-password"
                />
              </label>
              <label className="auth-form__label">
                New Password
                <input
                  type="password"
                  className="auth-form__input"
                  value={pwForm.newPassword}
                  onChange={e => setPwForm(f => ({ ...f, newPassword: e.target.value }))}
                  required
                  minLength={8}
                  autoComplete="new-password"
                />
              </label>
              <button
                type="submit"
                className="btn btn--primary"
                disabled={changePassword.isPending}
              >
                {changePassword.isPending ? 'Updating...' : 'Update Password'}
              </button>
            </form>
          </section>

          {/* Your Data */}
          <section className="settings-section">
            <h2 className="settings-section__title">Your Data</h2>
            <p className="settings__danger-warning" style={{ color: '#9ca3af' }}>
              Download a JSON file containing your account, encounters, characters, and custom monsters.
            </p>
            {exportError && <div className="settings-msg settings-msg--error">{exportError}</div>}
            <button
              className="btn btn--outline"
              onClick={handleExportData}
              disabled={exporting}
            >
              {exporting ? 'Preparing…' : 'Export My Data'}
            </button>
          </section>

          {/* Danger Zone */}
          <section className="settings-section settings__danger-zone">
            <h2 className="settings-section__title">Danger Zone</h2>
            {!showDeleteConfirm ? (
              <button
                className="btn btn--outline settings__danger-btn"
                onClick={() => setShowDeleteConfirm(true)}
              >
                Delete Account
              </button>
            ) : (
              <>
                <p className="settings__danger-warning">
                  This will permanently delete your account, encounters, and cancel any subscription. This cannot be undone.
                </p>
                {deleteError && <div className="settings-msg settings-msg--error">{deleteError}</div>}
                <form onSubmit={handleDeleteAccount} className="auth-form">
                  <label className="auth-form__label">
                    Confirm your password
                    <input
                      type="password"
                      className="auth-form__input"
                      value={deletePassword}
                      onChange={e => setDeletePassword(e.target.value)}
                      required
                      autoComplete="current-password"
                    />
                  </label>
                  <div className="settings__button-group">
                    <button
                      type="submit"
                      className="btn btn--primary settings__delete-btn"
                      disabled={deleteAccount.isPending}
                    >
                      {deleteAccount.isPending ? 'Deleting...' : 'Permanently Delete'}
                    </button>
                    <button
                      type="button"
                      className="btn btn--outline"
                      onClick={() => { setShowDeleteConfirm(false); setDeletePassword(''); setDeleteError(''); }}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </>
            )}
          </section>
        </div>
      </main>
      <Footer />
    </>
  );
}

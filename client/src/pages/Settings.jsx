import { useState } from 'react';
import { useCurrentUser, useChangePassword } from '../api/useAuth';
import { useBillingStatus, useCreatePortalSession } from '../api/useSubscription';
import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';
import '../styles/marketing.css';

export default function Settings() {
  const { data: user } = useCurrentUser();
  const { data: billing } = useBillingStatus();
  const portalSession = useCreatePortalSession();
  const changePassword = useChangePassword();
  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '' });
  const [pwMsg, setPwMsg] = useState('');
  const [pwError, setPwError] = useState('');

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
            <div className="settings-field">
              <span className="settings-field__label">Display Name</span>
              <span className="settings-field__value">{user.displayName}</span>
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
                  : user.role === 'admin' ? 'Admin (full access)' : 'Free'}
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
            ) : user.role !== 'admin' ? (
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
        </div>
      </main>
      <Footer />
    </>
  );
}

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useResetPassword } from '../api/useAuth';
import { useConsumeTokenParam } from '../hooks/useConsumeTokenParam';
import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';
import SEO from '../components/layout/SEO';
import TurnstileWidget from '../components/ui/TurnstileWidget';
import '../styles/marketing.css';

export default function ResetPassword() {
  const token = useConsumeTokenParam();
  const reset = useResetPassword();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState(null);
  const [turnstileReset, setTurnstileReset] = useState(0);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    try {
      await reset.mutateAsync({ token, password, turnstileToken });
      setDone(true);
    } catch (err) {
      setError(err.response?.data?.error || 'Reset failed');
      setTurnstileReset(n => n + 1); // consumed token — force a fresh challenge
    }
  }

  return (
    <>
      <SEO title="Reset Password | Roll Initiative" description="Set a new Roll Initiative password." path="/reset-password" noindex />
      <Navbar />
      <main className="auth-page">
        <div className="auth-card">
          <h1 className="auth-card__title">Reset Password</h1>

          {done ? (
            <>
              <p className="auth-card__subtitle">Password updated successfully!</p>
              <div className="auth-card__links">
                <Link to="/login">Log in with your new password</Link>
              </div>
            </>
          ) : !token ? (
            <>
              <p className="auth-card__subtitle">Invalid or missing reset token.</p>
              <div className="auth-card__links">
                <Link to="/forgot-password">Request a new reset link</Link>
              </div>
            </>
          ) : (
            <>
              {error && <div className="auth-card__error">{error}</div>}
              <form onSubmit={handleSubmit} className="auth-form">
                <label className="auth-form__label">
                  New Password
                  <input
                    type="password"
                    className="auth-form__input"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    minLength={8}
                    autoComplete="new-password"
                  />
                  <span className="auth-form__hint">At least 8 characters</span>
                </label>
                <TurnstileWidget onToken={setTurnstileToken} resetSignal={turnstileReset} />
                <button
                  type="submit"
                  className="btn btn--primary auth-form__submit"
                  disabled={reset.isPending}
                >
                  {reset.isPending ? 'Resetting...' : 'Reset Password'}
                </button>
              </form>
            </>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}

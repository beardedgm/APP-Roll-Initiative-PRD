import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useResetPassword } from '../api/useAuth';
import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';
import '../styles/marketing.css';

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const reset = useResetPassword();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    try {
      await reset.mutateAsync({ token, password });
      setDone(true);
    } catch (err) {
      setError(err.response?.data?.error || 'Reset failed');
    }
  }

  return (
    <>
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

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForgotPassword } from '../api/useAuth';
import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';
import SEO from '../components/layout/SEO';
import TurnstileWidget from '../components/ui/TurnstileWidget';
import '../styles/marketing.css';

export default function ForgotPassword() {
  const forgot = useForgotPassword();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [turnstileToken, setTurnstileToken] = useState(null);
  const [turnstileReset, setTurnstileReset] = useState(0);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    try {
      await forgot.mutateAsync({ email, turnstileToken });
      setSent(true);
    } catch (err) {
      setError(err.response?.data?.error || 'Something went wrong. Please try again.');
      setTurnstileReset(n => n + 1); // consumed token — force a fresh challenge
    }
  }

  return (
    <>
      <SEO title="Forgot Password | Roll Initiative" description="Reset your Roll Initiative password." path="/forgot-password" noindex />
      <Navbar />
      <main className="auth-page">
        <div className="auth-card">
          <h1 className="auth-card__title">Forgot Password</h1>

          {sent ? (
            <>
              <p className="auth-card__subtitle">If an account exists with that email, a reset link has been sent. Check your inbox.</p>
              <div className="auth-card__links">
                <Link to="/login">Back to login</Link>
              </div>
            </>
          ) : (
            <>
              <p className="auth-card__subtitle">Enter your email and we'll send a reset link</p>
              {error && <div className="auth-card__error">{error}</div>}
              <form onSubmit={handleSubmit} className="auth-form">
                <label className="auth-form__label">
                  Email
                  <input
                    type="email"
                    className="auth-form__input"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                  />
                </label>
                <TurnstileWidget onToken={setTurnstileToken} resetSignal={turnstileReset} />
                <button
                  type="submit"
                  className="btn btn--primary auth-form__submit"
                  disabled={forgot.isPending}
                >
                  {forgot.isPending ? 'Sending...' : 'Send Reset Link'}
                </button>
              </form>
              <div className="auth-card__links">
                <Link to="/login">Back to login</Link>
              </div>
            </>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}

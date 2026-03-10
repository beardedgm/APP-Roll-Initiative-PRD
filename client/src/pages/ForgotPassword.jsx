import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForgotPassword } from '../api/useAuth';
import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';
import TurnstileWidget from '../components/ui/TurnstileWidget';
import '../styles/marketing.css';

export default function ForgotPassword() {
  const forgot = useForgotPassword();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    await forgot.mutateAsync({ email, turnstileToken });
    setSent(true);
  }

  return (
    <>
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
                <TurnstileWidget onToken={setTurnstileToken} />
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

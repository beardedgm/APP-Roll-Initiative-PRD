import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useLogin } from '../api/useAuth';
import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';
import SEO from '../components/layout/SEO';
import TurnstileWidget from '../components/ui/TurnstileWidget';
import '../styles/marketing.css';

export default function Login() {
  const navigate = useNavigate();
  const login = useLogin();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [turnstileToken, setTurnstileToken] = useState(null);
  const [turnstileReset, setTurnstileReset] = useState(0);

  function handleChange(e) {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    try {
      await login.mutateAsync({ ...form, turnstileToken });
      navigate('/tracker');
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed');
      setTurnstileReset(n => n + 1); // consumed token — force a fresh challenge
    }
  }

  return (
    <>
      <SEO title="Log In | Roll Initiative" description="Log in to Roll Initiative." path="/login" noindex />
      <Navbar />
      <main className="auth-page">
        <div className="auth-card">
          <h1 className="auth-card__title">Log In</h1>
          <p className="auth-card__subtitle">Welcome back, adventurer</p>

          {error && <div className="auth-card__error">{error}</div>}

          <form onSubmit={handleSubmit} className="auth-form">
            <label className="auth-form__label">
              Email
              <input
                type="email"
                name="email"
                className="auth-form__input"
                value={form.email}
                onChange={handleChange}
                required
                autoComplete="email"
              />
            </label>
            <label className="auth-form__label">
              Password
              <input
                type="password"
                name="password"
                className="auth-form__input"
                value={form.password}
                onChange={handleChange}
                required
                autoComplete="current-password"
              />
            </label>
            <TurnstileWidget onToken={setTurnstileToken} resetSignal={turnstileReset} />
            <button
              type="submit"
              className="btn btn--primary auth-form__submit"
              disabled={login.isPending}
            >
              {login.isPending ? 'Logging in...' : 'Log In'}
            </button>
          </form>

          <div className="auth-card__links">
            <Link to="/forgot-password">Forgot password?</Link>
            <span className="auth-card__divider">&bull;</span>
            <Link to="/register">Create an account</Link>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}

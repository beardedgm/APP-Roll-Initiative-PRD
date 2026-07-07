import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useRegister } from '../api/useAuth';
import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';
import SEO from '../components/layout/SEO';
import TurnstileWidget from '../components/ui/TurnstileWidget';
import '../styles/marketing.css';

export default function Register() {
  const register = useRegister();
  const [form, setForm] = useState({ email: '', password: '', displayName: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [turnstileToken, setTurnstileToken] = useState(null);
  const [turnstileReset, setTurnstileReset] = useState(0);

  function handleChange(e) {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      const result = await register.mutateAsync({ ...form, turnstileToken });
      setSuccess(result.message || 'Check your email to verify your account.');
    } catch (err) {
      const msg = err.response?.data?.error || 'Registration failed';
      setError(msg);
      setTurnstileReset(n => n + 1); // consumed token — force a fresh challenge
    }
  }

  return (
    <>
      <SEO title="Create Account | Roll Initiative" description="Create a Roll Initiative account." path="/register" noindex />
      <Navbar />
      <main className="auth-page">
        <div className="auth-card">
          <h1 className="auth-card__title">Create Account</h1>
          <p className="auth-card__subtitle">Join the quest</p>

          {error && <div className="auth-card__error">{error}</div>}
          {success && (
            <div className="auth-card__success">
              <p>{success}</p>
              <Link to="/login" className="btn btn--primary" style={{ marginTop: '1rem' }}>Go to Login</Link>
            </div>
          )}

          {!success && (
            <form onSubmit={handleSubmit} className="auth-form">
              <label className="auth-form__label">
                Display Name
                <input
                  type="text"
                  name="displayName"
                  className="auth-form__input"
                  value={form.displayName}
                  onChange={handleChange}
                  required
                  maxLength={50}
                  autoComplete="name"
                />
              </label>
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
                  minLength={8}
                  autoComplete="new-password"
                />
                <span className="auth-form__hint">At least 8 characters</span>
              </label>
              <TurnstileWidget onToken={setTurnstileToken} resetSignal={turnstileReset} />
              <button
                type="submit"
                className="btn btn--primary auth-form__submit"
                disabled={register.isPending}
              >
                {register.isPending ? 'Creating account...' : 'Create Account'}
              </button>
            </form>
          )}

          <div className="auth-card__links">
            <Link to="/login">Already have an account? Log in</Link>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}

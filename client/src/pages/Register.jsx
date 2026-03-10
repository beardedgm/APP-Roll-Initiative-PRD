import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useRegister } from '../api/useAuth';
import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';
import '../styles/marketing.css';

export default function Register() {
  const navigate = useNavigate();
  const register = useRegister();
  const [form, setForm] = useState({ email: '', password: '', displayName: '' });
  const [error, setError] = useState('');

  function handleChange(e) {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    try {
      await register.mutateAsync(form);
      navigate('/tracker');
    } catch (err) {
      const msg = err.response?.data?.error || 'Registration failed';
      setError(msg);
    }
  }

  return (
    <>
      <Navbar />
      <main className="auth-page">
        <div className="auth-card">
          <h1 className="auth-card__title">Create Account</h1>
          <p className="auth-card__subtitle">Join the quest</p>

          {error && <div className="auth-card__error">{error}</div>}

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
            <button
              type="submit"
              className="btn btn--primary auth-form__submit"
              disabled={register.isPending}
            >
              {register.isPending ? 'Creating account...' : 'Create Account'}
            </button>
          </form>

          <div className="auth-card__links">
            <Link to="/login">Already have an account? Log in</Link>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}

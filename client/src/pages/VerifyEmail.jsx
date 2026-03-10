import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useVerifyEmail } from '../api/useAuth';
import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';
import '../styles/marketing.css';

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const verify = useVerifyEmail();
  const [status, setStatus] = useState('loading');

  useEffect(() => {
    if (!token) {
      setStatus('invalid');
      return;
    }

    verify.mutateAsync({ token })
      .then(() => setStatus('success'))
      .catch(() => setStatus('error'));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  return (
    <>
      <Navbar />
      <main className="auth-page">
        <div className="auth-card">
          <h1 className="auth-card__title">Email Verification</h1>

          {status === 'loading' && (
            <p className="auth-card__subtitle">Verifying your email...</p>
          )}
          {status === 'success' && (
            <>
              <p className="auth-card__subtitle">Your email has been verified!</p>
              <div className="auth-card__links">
                <Link to="/tracker">Go to Tracker</Link>
              </div>
            </>
          )}
          {status === 'error' && (
            <>
              <p className="auth-card__subtitle">This verification link is invalid or has expired.</p>
              <div className="auth-card__links">
                <Link to="/login">Log in to request a new link</Link>
              </div>
            </>
          )}
          {status === 'invalid' && (
            <>
              <p className="auth-card__subtitle">No verification token provided.</p>
              <div className="auth-card__links">
                <Link to="/">Go home</Link>
              </div>
            </>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}

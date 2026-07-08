import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { HelmetProvider } from 'react-helmet-async';
import * as Sentry from '@sentry/react';
import './styles/shared.css';
import App from './App.jsx';
import { initAnalytics } from './lib/analytics';
import { getConsent, CONSENT_ACCEPTED } from './lib/consent';

// Sentry — error tracking (essential; not gated by analytics consent)
if (import.meta.env.VITE_SENTRY_DSN) {
  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    environment: import.meta.env.MODE,
    tracesSampleRate: 0.1,
  });
}

// PostHog — opt-in only (n2). Initialize on load solely if the user previously
// accepted; otherwise the consent banner initializes it on Accept.
if (getConsent() === CONSENT_ACCEPTED) {
  initAnalytics();
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <HelmetProvider>
      <App />
    </HelmetProvider>
  </StrictMode>,
);

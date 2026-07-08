import { useState } from 'react';
import { Link } from 'react-router-dom';
import { getConsent, setConsent, CONSENT_ACCEPTED, CONSENT_DECLINED } from '../../lib/consent';
import { initAnalytics } from '../../lib/analytics';

/**
 * Opt-in analytics consent banner (n2). Shown to everyone until a choice is made.
 * Accept initializes PostHog and persists consent; Decline persists a decline and
 * never loads analytics. The choice is remembered, so the banner appears once.
 */
export default function ConsentBanner() {
  const [decided, setDecided] = useState(() => getConsent() !== null);

  if (decided) return null;

  const accept = () => {
    setConsent(CONSENT_ACCEPTED);
    initAnalytics();
    setDecided(true);
  };

  const decline = () => {
    setConsent(CONSENT_DECLINED);
    setDecided(true);
  };

  return (
    <div className="consent-banner" role="dialog" aria-label="Analytics consent" aria-live="polite">
      <p className="consent-banner__text">
        We use privacy-friendly product analytics to understand how the app is used and improve it.
        Nothing loads until you choose. <Link to="/privacy" className="consent-banner__link">Privacy Policy</Link>
      </p>
      <div className="consent-banner__actions">
        <button type="button" className="btn btn--sm" onClick={decline}>Decline</button>
        <button type="button" className="btn btn--primary btn--sm" onClick={accept}>Accept</button>
      </div>
    </div>
  );
}

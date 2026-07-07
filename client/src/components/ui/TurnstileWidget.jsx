import { useEffect, useRef, useState, useCallback } from 'react';

const SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY;

export default function TurnstileWidget({ onToken, resetSignal = 0 }) {
  const containerRef = useRef(null);
  const widgetIdRef = useRef(null);
  const didMountRef = useRef(false);
  const [loaded, setLoaded] = useState(!!window.turnstile);
  const [verified, setVerified] = useState(false);

  // Stable callback ref — update in effect to satisfy react-hooks/refs
  const onTokenRef = useRef(onToken);
  useEffect(() => {
    onTokenRef.current = onToken;
  });

  useEffect(() => {
    if (!SITE_KEY) {
      // Development: no CAPTCHA needed
      return;
    }

    // Load script if not already present
    if (!document.querySelector('script[src*="turnstile"]')) {
      const script = document.createElement('script');
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?onload=onTurnstileLoad';
      script.async = true;
      window.onTurnstileLoad = () => setLoaded(true);
      document.head.appendChild(script);
    } else if (!window.turnstile) {
      // Script tag exists but hasn't loaded yet — chain our callback
      const prev = window.onTurnstileLoad;
      window.onTurnstileLoad = () => {
        if (prev) prev();
        setLoaded(true);
      };
    }
    // If window.turnstile already exists, loaded was initialized to true via useState
  }, []);

  const handleToken = useCallback((token) => {
    setVerified(true);
    onTokenRef.current?.(token);
  }, []);

  useEffect(() => {
    if (!loaded || !SITE_KEY || !containerRef.current) return;

    widgetIdRef.current = window.turnstile.render(containerRef.current, {
      sitekey: SITE_KEY,
      callback: handleToken,
      theme: 'dark',
      size: 'flexible',
    });

    return () => {
      if (widgetIdRef.current !== null && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current);
      }
    };
  }, [loaded, handleToken]);

  // Reset the widget when the parent bumps resetSignal (e.g. after a failed
  // submit) so a consumed token isn't reused on retry. Skip the initial mount.
  useEffect(() => {
    if (!didMountRef.current) { didMountRef.current = true; return; }
    if (widgetIdRef.current !== null && window.turnstile) {
      window.turnstile.reset(widgetIdRef.current);
      setVerified(false);
      onTokenRef.current?.(null);
    }
  }, [resetSignal]);

  if (!SITE_KEY) return null;

  return (
    <div className={`turnstile-wrapper${verified ? ' turnstile-wrapper--verified' : ''}`}>
      <div ref={containerRef} className="turnstile-container" />
    </div>
  );
}

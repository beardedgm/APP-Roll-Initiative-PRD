import { useEffect, useRef, useState, useCallback } from 'react';

const SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY;

export default function TurnstileWidget({ onToken }) {
  const containerRef = useRef(null);
  const widgetIdRef = useRef(null);
  const [loaded, setLoaded] = useState(!!window.turnstile);

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
    onTokenRef.current?.(token);
  }, []);

  useEffect(() => {
    if (!loaded || !SITE_KEY || !containerRef.current) return;

    widgetIdRef.current = window.turnstile.render(containerRef.current, {
      sitekey: SITE_KEY,
      callback: handleToken,
      theme: 'dark',
    });

    return () => {
      if (widgetIdRef.current !== null && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current);
      }
    };
  }, [loaded, handleToken]);

  if (!SITE_KEY) return null;

  return <div ref={containerRef} style={{ margin: '1rem 0' }} />;
}

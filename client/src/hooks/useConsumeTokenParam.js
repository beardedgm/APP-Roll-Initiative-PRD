import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';

/**
 * Read the one-time `token` query param once, then strip it from the URL so it
 * can't leak to analytics or the referrer header (finding f5). Other query
 * params are preserved. Returns the captured token (empty string if none).
 */
export function useConsumeTokenParam() {
  const [searchParams, setSearchParams] = useSearchParams();
  // Capture on first render so the value survives the URL scrub below.
  const [token] = useState(() => searchParams.get('token') || '');

  useEffect(() => {
    if (searchParams.has('token')) {
      const next = new URLSearchParams(searchParams);
      next.delete('token');
      setSearchParams(next, { replace: true });
    }
    // Run once on mount; `token` is already captured and stable.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return token;
}

import { describe, it, expect } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { MemoryRouter, useSearchParams } from 'react-router-dom';
import { useConsumeTokenParam } from './useConsumeTokenParam';

function wrapperFor(entry) {
  return ({ children }) => <MemoryRouter initialEntries={[entry]}>{children}</MemoryRouter>;
}

// The token must be captured on first render (so the page can use it) AND then
// stripped from the URL, so it never reaches analytics / the referrer (f5).
describe('useConsumeTokenParam', () => {
  it('captures the token then strips it from the URL', async () => {
    const { result } = renderHook(() => {
      const token = useConsumeTokenParam();
      const [sp] = useSearchParams();
      return { token, qs: sp.toString() };
    }, { wrapper: wrapperFor('/reset-password?token=secret123') });

    expect(result.current.token).toBe('secret123');
    await waitFor(() => expect(result.current.qs).toBe(''));
  });

  it('keeps other query params while removing the token', async () => {
    const { result } = renderHook(() => {
      const token = useConsumeTokenParam();
      const [sp] = useSearchParams();
      return { token, qs: sp.toString() };
    }, { wrapper: wrapperFor('/verify-email?token=abc&ref=email') });

    expect(result.current.token).toBe('abc');
    await waitFor(() => expect(result.current.qs).toBe('ref=email'));
  });

  it('returns an empty string when there is no token', () => {
    const { result } = renderHook(() => useConsumeTokenParam(), {
      wrapper: wrapperFor('/reset-password'),
    });
    expect(result.current).toBe('');
  });
});

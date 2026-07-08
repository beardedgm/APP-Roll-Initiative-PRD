import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('../../lib/analytics', () => ({ initAnalytics: vi.fn() }));

import { initAnalytics } from '../../lib/analytics';
import ConsentBanner from './ConsentBanner';
import { getConsent, CONSENT_ACCEPTED, CONSENT_DECLINED } from '../../lib/consent';

const renderBanner = () => render(<MemoryRouter><ConsentBanner /></MemoryRouter>);

beforeEach(() => { localStorage.clear(); initAnalytics.mockClear(); });
afterEach(cleanup);

// n2: opt-in consent banner shown to everyone. Accept initializes PostHog and
// persists; Decline persists without initializing; a prior choice hides it.
describe('ConsentBanner', () => {
  it('shows when no choice has been made', () => {
    renderBanner();
    expect(screen.getByRole('button', { name: /accept/i })).toBeTruthy();
  });

  it('Accept initializes analytics, persists consent, and hides', () => {
    renderBanner();
    fireEvent.click(screen.getByRole('button', { name: /accept/i }));
    expect(initAnalytics).toHaveBeenCalled();
    expect(getConsent()).toBe(CONSENT_ACCEPTED);
    expect(screen.queryByRole('button', { name: /accept/i })).toBeNull();
  });

  it('Decline persists without initializing analytics, and hides', () => {
    renderBanner();
    fireEvent.click(screen.getByRole('button', { name: /decline/i }));
    expect(initAnalytics).not.toHaveBeenCalled();
    expect(getConsent()).toBe(CONSENT_DECLINED);
    expect(screen.queryByRole('button', { name: /decline/i })).toBeNull();
  });

  it('does not render if a choice was already made', () => {
    localStorage.setItem('analytics_consent', 'declined');
    renderBanner();
    expect(screen.queryByRole('button', { name: /accept/i })).toBeNull();
  });
});

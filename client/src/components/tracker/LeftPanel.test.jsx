import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('../../api/useAuth', () => ({ useCurrentUser: vi.fn() }));
vi.mock('./CreatureList', () => ({ default: () => <div data-testid="creature-list" /> }));
vi.mock('./SpellList', () => ({ default: () => <div data-testid="spell-list" /> }));
vi.mock('./SystemToggle', () => ({ default: () => <div data-testid="system-toggle" /> }));
vi.mock('./CharacterLibrary', () => ({ default: () => <div data-testid="character-library" /> }));
vi.mock('./EncounterLibrary', () => ({ default: () => <div data-testid="encounter-library" /> }));

import { useCurrentUser } from '../../api/useAuth';
import useCombatStore from '../../store/useCombatStore';
import LeftPanel from './LeftPanel';

function renderPanel() {
  return render(<MemoryRouter><LeftPanel /></MemoryRouter>);
}

beforeEach(() => useCombatStore.getState().clearAll());
afterEach(() => { cleanup(); useCurrentUser.mockReset(); });

// f8: free users can add their own party in the Characters tab (reused form),
// while the saved/synced Character Library stays premium.
describe('LeftPanel — Characters tab access (f8)', () => {
  it('gives free users the manual add form and an upgrade prompt, not the paywall card', () => {
    useCurrentUser.mockReturnValue({ data: null });
    renderPanel();
    fireEvent.click(screen.getByRole('button', { name: 'Characters' }));

    expect(screen.getByText('Add to Encounter')).toBeTruthy();
    expect(screen.getByRole('link', { name: /upgrade/i }).getAttribute('href')).toBe('/pricing');
    expect(screen.queryByTestId('character-library')).toBeNull();
  });

  it('gives subscribers the saved Character Library', () => {
    useCurrentUser.mockReturnValue({ data: { subscriptionStatus: 'active' } });
    renderPanel();
    fireEvent.click(screen.getByRole('button', { name: 'Characters' }));

    expect(screen.getByTestId('character-library')).toBeTruthy();
    expect(screen.queryByText('Add to Encounter')).toBeNull();
  });
});

import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('../components/layout/Navbar', () => ({ default: () => null }));
vi.mock('../components/layout/Footer', () => ({ default: () => null }));
vi.mock('../components/layout/SEO', () => ({ default: () => null }));

import Licensing from './Licensing';

afterEach(cleanup);

// n1: the Licensing & Attribution page renders the supplied legal copy verbatim.
// Smoke-test that the title and the §15 non-affiliation statement are present.
describe('Licensing page', () => {
  it('renders the page title', () => {
    render(<MemoryRouter><Licensing /></MemoryRouter>);
    expect(screen.getByRole('heading', { level: 1 }).textContent)
      .toBe('RoleInitiative.app licensing and attribution');
  });

  it('renders the §15 non-affiliation statement verbatim', () => {
    render(<MemoryRouter><Licensing /></MemoryRouter>);
    expect(
      screen.getByText(/used only to indicate compatibility, identify source material/i)
    ).toBeTruthy();
  });
});

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('../components/layout/Navbar', () => ({ default: () => null }));
vi.mock('../components/layout/Footer', () => ({ default: () => null }));
vi.mock('../components/ui/TurnstileWidget', () => ({ default: () => null }));
vi.mock('../api/useAuth', () => ({ useForgotPassword: vi.fn() }));

import { useForgotPassword } from '../api/useAuth';
import ForgotPassword from './ForgotPassword';

afterEach(cleanup);
beforeEach(() => useForgotPassword.mockReset());

// f19: the submit handler had no try/catch, so a 429/400 produced an unhandled
// rejection and zero user feedback. It must surface the error and not flip to
// the "sent" confirmation.
describe('ForgotPassword error handling', () => {
  it('shows the server error and stays on the form when the request fails', async () => {
    const mutateAsync = vi.fn().mockRejectedValue({ response: { data: { error: 'Too many requests' } } });
    useForgotPassword.mockReturnValue({ mutateAsync, isPending: false });

    render(<MemoryRouter><ForgotPassword /></MemoryRouter>);
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'a@b.com' } });
    fireEvent.click(screen.getByRole('button', { name: /send reset link/i }));

    await waitFor(() => screen.getByText('Too many requests'));
    // still on the form, not the success confirmation
    expect(screen.queryByText(/reset link has been sent/i)).toBeNull();
  });

  it('shows the confirmation on success', async () => {
    const mutateAsync = vi.fn().mockResolvedValue({});
    useForgotPassword.mockReturnValue({ mutateAsync, isPending: false });

    render(<MemoryRouter><ForgotPassword /></MemoryRouter>);
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'a@b.com' } });
    fireEvent.click(screen.getByRole('button', { name: /send reset link/i }));

    await waitFor(() => screen.getByText(/reset link has been sent/i));
  });
});

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';

// SITE_KEY is read at module load, so stub the env and (re)import the module.
async function loadWidget() {
  vi.resetModules();
  vi.stubEnv('VITE_TURNSTILE_SITE_KEY', 'test-site-key');
  return (await import('./TurnstileWidget')).default;
}

beforeEach(() => {
  window.turnstile = { render: vi.fn(() => 'widget-1'), reset: vi.fn(), remove: vi.fn() };
});
afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
  delete window.turnstile;
});

// f18: the widget never reset after a failed submit, so a retry re-sent the
// already-consumed token and failed CAPTCHA until a manual page refresh. A
// resetSignal bump from the parent must reset the widget and clear the token.
describe('TurnstileWidget', () => {
  it('resets the widget and clears the token when resetSignal changes', async () => {
    const TurnstileWidget = await loadWidget();
    const onToken = vi.fn();
    const { rerender } = render(<TurnstileWidget onToken={onToken} resetSignal={0} />);
    expect(window.turnstile.render).toHaveBeenCalled();

    rerender(<TurnstileWidget onToken={onToken} resetSignal={1} />);

    expect(window.turnstile.reset).toHaveBeenCalledWith('widget-1');
    expect(onToken).toHaveBeenCalledWith(null);
  });

  it('does not reset on the initial mount', async () => {
    const TurnstileWidget = await loadWidget();
    render(<TurnstileWidget onToken={vi.fn()} resetSignal={0} />);
    expect(window.turnstile.reset).not.toHaveBeenCalled();
  });
});

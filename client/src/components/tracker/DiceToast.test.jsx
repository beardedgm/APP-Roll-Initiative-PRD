import { describe, it, expect, beforeEach } from 'vitest';
import { render, act } from '@testing-library/react';
import DiceToast from './DiceToast';
import useCombatStore from '../../store/useCombatStore';

function roll(id, total) {
  return {
    id,
    sides: 20,
    count: 1,
    modifier: 3,
    advantage: 'normal',
    rolls: [total - 3],
    total,
  };
}

beforeEach(() => {
  useCombatStore.getState().clearAll();
});

// l1: diceHistory is persisted, so the previous session's last roll is at [0]
// on mount — it must NOT pop up as a live toast when the tracker reloads.
describe('DiceToast stale-roll gating', () => {
  it('does not show a persisted roll from before mount', () => {
    useCombatStore.setState({ diceHistory: [roll('old-roll', 17)] });
    const { container, unmount } = render(<DiceToast />);
    const toast = container.querySelector('.dice-toast');
    expect(toast).not.toBeNull();
    expect(toast.className).not.toContain('dice-toast--visible');
    unmount();
  });

  it('shows a roll made after mount, and dismiss hides it', () => {
    useCombatStore.setState({ diceHistory: [roll('old-roll', 17)] });
    const { container, unmount } = render(<DiceToast />);

    act(() => {
      useCombatStore.setState(s => ({ diceHistory: [roll('new-roll', 22), ...s.diceHistory] }));
    });

    const toast = container.querySelector('.dice-toast');
    expect(toast.className).toContain('dice-toast--visible');
    expect(toast.textContent).toContain('22');

    act(() => {
      container.querySelector('[aria-label="Dismiss roll"]').click();
    });
    expect(container.querySelector('.dice-toast').className).not.toContain('dice-toast--visible');
    unmount();
  });

  it('renders nothing at all with an empty history', () => {
    const { container, unmount } = render(<DiceToast />);
    expect(container.querySelector('.dice-toast')).toBeNull();
    unmount();
  });
});

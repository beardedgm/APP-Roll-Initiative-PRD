import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import PlayerDiceToast from './PlayerDiceToast';

afterEach(cleanup);

describe('PlayerDiceToast', () => {
  it('renders nothing when there is no roll', () => {
    const { container } = render(<PlayerDiceToast latestSharedRoll={null} />);
    expect(container.firstChild).toBeNull();
  });

  it('shows only the result total — never the breakdown or modifier', () => {
    // A full local-view roll: the toast must surface 22 and nothing that
    // reveals the +7 modifier or the individual die face (15).
    render(<PlayerDiceToast latestSharedRoll={{
      total: 22, sides: 20, rolls: [15], modifier: 7, label: '1d20+7', timestamp: 1,
    }} />);
    expect(screen.getByText('22')).toBeTruthy();
    expect(screen.queryByText(/1d20/)).toBeNull();
    expect(screen.queryByText(/\+7/)).toBeNull();
    expect(screen.queryByText(/15/)).toBeNull();
  });

  it('honors the server crit flag (gold on nat20) without die faces', () => {
    const { container } = render(<PlayerDiceToast latestSharedRoll={{ total: 27, crit: 'nat20', timestamp: 2 }} />);
    expect(container.querySelector('.player-dice-toast--nat20')).toBeTruthy();
  });

  it('honors the server crit flag (red on nat1)', () => {
    const { container } = render(<PlayerDiceToast latestSharedRoll={{ total: 1, crit: 'nat1', timestamp: 3 }} />);
    expect(container.querySelector('.player-dice-toast--nat1')).toBeTruthy();
  });

  it('derives the crit highlight from sides/rolls for the local view', () => {
    const { container } = render(<PlayerDiceToast latestSharedRoll={{ total: 20, sides: 20, rolls: [20], timestamp: 4 }} />);
    expect(container.querySelector('.player-dice-toast--nat20')).toBeTruthy();
  });

  it('does not highlight crits on non-d20 rolls', () => {
    const { container } = render(<PlayerDiceToast latestSharedRoll={{ total: 6, sides: 6, rolls: [1], timestamp: 5 }} />);
    expect(container.querySelector('.player-dice-toast--nat1')).toBeNull();
    expect(container.querySelector('.player-dice-toast--nat20')).toBeNull();
  });
});

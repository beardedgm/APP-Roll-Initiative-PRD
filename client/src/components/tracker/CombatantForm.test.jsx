import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import CombatantForm from './CombatantForm';
import useCombatStore from '../../store/useCombatStore';

const get = () => useCombatStore.getState();

beforeEach(() => get().clearAll());
afterEach(cleanup);

// f8: the reused CombatantForm is the free-tier "add my party" form. It offers
// only Player/NPC (monsters come from the Creatures tab), has no quantity, and
// adds a single combatant to the current (local) encounter.
describe('CombatantForm (free-tier party add)', () => {
  it('offers only Player and NPC types, defaulting to Player', () => {
    render(<CombatantForm />);
    const select = screen.getByLabelText('Type');
    const options = Array.from(select.querySelectorAll('option')).map(o => o.value);
    expect(options).toEqual(['player', 'npc']);
    expect(select.value).toBe('player');
  });

  it('has no quantity field', () => {
    render(<CombatantForm />);
    expect(screen.queryByLabelText('Qty')).toBeNull();
  });

  it('adds a single player combatant on submit', () => {
    render(<CombatantForm />);
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Aria' } });
    fireEvent.change(screen.getByLabelText('Max HP'), { target: { value: '25' } });
    fireEvent.change(screen.getByLabelText('AC'), { target: { value: '16' } });
    fireEvent.click(screen.getByRole('button', { name: /add/i }));

    const combatants = get().combatants;
    expect(combatants).toHaveLength(1);
    expect(combatants[0]).toMatchObject({
      name: 'Aria',
      type: 'player',
      ac: 16,
      hp: { current: 25, max: 25 },
    });
  });

  it('does not add a combatant when the name is blank', () => {
    render(<CombatantForm />);
    fireEvent.change(screen.getByLabelText('Max HP'), { target: { value: '10' } });
    fireEvent.click(screen.getByRole('button', { name: /add/i }));
    expect(get().combatants).toHaveLength(0);
  });
});

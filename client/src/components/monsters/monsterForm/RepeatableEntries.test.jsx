import { describe, it, expect, afterEach } from 'vitest';
import { useState } from 'react';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import RepeatableEntries from './RepeatableEntries';
import { newEntryId } from '../../../utils/monsterFormHelpers';

afterEach(cleanup);

// Stateful harness mirroring MonsterFormModal's id-based entry handlers, so the
// test exercises RepeatableEntries' keying together with the real add/update/
// remove logic — without pulling in the Zustand stores.
function Harness() {
  const [entries, setEntries] = useState([]);
  return (
    <RepeatableEntries
      entries={entries}
      entryKey="traits"
      onAdd={() => setEntries(p => [...p, { id: newEntryId(), name: '', description: '' }])}
      onUpdate={(_k, id, field, value) =>
        setEntries(p => p.map(e => (e.id === id ? { ...e, [field]: value } : e)))}
      onRemove={(_k, id) => setEntries(p => p.filter(e => e.id !== id))}
    />
  );
}

function addThreeNamed() {
  render(<Harness />);
  const add = screen.getByText('+ Add');
  fireEvent.click(add); fireEvent.click(add); fireEvent.click(add);
  const names = screen.getAllByPlaceholderText('Name');
  fireEvent.change(names[0], { target: { value: 'One' } });
  fireEvent.change(names[1], { target: { value: 'Two' } });
  fireEvent.change(names[2], { target: { value: 'Three' } });
}

describe('RepeatableEntries', () => {
  it('renders an input per entry and adds new ones', () => {
    render(<Harness />);
    expect(screen.queryAllByPlaceholderText('Name')).toHaveLength(0);
    fireEvent.click(screen.getByText('+ Add'));
    expect(screen.getAllByPlaceholderText('Name')).toHaveLength(1);
  });

  it('keeps the correct values when the MIDDLE entry is removed', () => {
    addThreeNamed();
    fireEvent.click(screen.getAllByTitle('Remove')[1]); // remove "Two"
    const after = screen.getAllByPlaceholderText('Name').map(i => i.value);
    expect(after).toEqual(['One', 'Three']);
  });

  it('preserves the surviving entries\' DOM nodes (id keying, not index)', () => {
    addThreeNamed();
    // Capture the actual DOM node showing "Three" before removal.
    const thirdNode = screen.getAllByPlaceholderText('Name')[2];
    expect(thirdNode.value).toBe('Three');

    fireEvent.click(screen.getAllByTitle('Remove')[1]); // remove the middle "Two"

    // With index keys, removing the middle unmounts the LAST node and reuses
    // earlier ones — so "Three"'s original node would be gone. With id keys it
    // is preserved. This assertion is what actually guards the keying fix.
    expect(document.body.contains(thirdNode)).toBe(true);
    expect(thirdNode.value).toBe('Three');
  });
});

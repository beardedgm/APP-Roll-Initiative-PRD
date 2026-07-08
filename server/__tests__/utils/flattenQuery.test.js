import { describe, it, expect } from 'vitest';
import { flattenQuery } from '../../utils/flattenQuery.js';

// l2: duplicate query keys arrive as arrays (?q=a&q=b -> ['a','b']), and a later
// value.trim()/regex on an array throws -> 500. Flatten to a single string so
// the handler stays graceful.
describe('flattenQuery', () => {
  it('passes single string values through', () => {
    expect(flattenQuery({ q: 'goblin', gameSystem: '5e' })).toEqual({ q: 'goblin', gameSystem: '5e' });
  });

  it('collapses a duplicate (array) key to its first string', () => {
    expect(flattenQuery({ q: ['a', 'b'] })).toEqual({ q: 'a' });
  });

  it('drops non-string values (e.g. bracket-notation objects) to undefined', () => {
    expect(flattenQuery({ q: { $ne: 'x' } })).toEqual({ q: undefined });
  });

  it('handles an empty or missing query', () => {
    expect(flattenQuery({})).toEqual({});
    expect(flattenQuery(undefined)).toEqual({});
  });
});

import { describe, it, expect } from 'vitest';
import { parsePf2eTraits } from '../../scripts/seedCore.js';

// f20: PF2e trait lines are plain comma-separated text (e.g. "uncommon, n, large,
// beast"), but the seed parser matched italic/bold markup that isn't there, so
// every PF2e monster seeded with empty size AND type, breaking the ?type= filter.
describe('parsePf2eTraits', () => {
  it('extracts size and creature-type from a plain-text traits line', () => {
    expect(parsePf2eTraits('unique, ln, medium, human, humanoid'))
      .toEqual({ size: 'medium', type: 'human, humanoid' });
    expect(parsePf2eTraits('uncommon, n, large, beast'))
      .toEqual({ size: 'large', type: 'beast' });
  });

  it('drops the leading rarity/alignment tokens from type', () => {
    expect(parsePf2eTraits('uncommon, n, medium, animal').type).toBe('animal');
  });

  it('handles a missing size word gracefully', () => {
    expect(parsePf2eTraits('construct, mindless')).toEqual({ size: '', type: 'construct, mindless' });
  });

  it('returns empty for an empty line', () => {
    expect(parsePf2eTraits('')).toEqual({ size: '', type: '' });
  });
});

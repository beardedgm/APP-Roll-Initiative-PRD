import { describe, it, expect } from 'vitest';
import { resolveCreatureSystem } from './resolveCreatureSystem';

const customs = [
  { slug: 'custom-goblin-abc', gameSystem: 'pf2e' },
  { slug: 'custom-orc-def', gameSystem: '5e' },
];

// l6: showStatBlock routed on the pf2e_ slug prefix, but custom monsters use
// custom-* slugs that don't encode the system, so a custom PF2e monster opened
// under the 5e tab. Resolve the system from the stored gameSystem instead.
describe('resolveCreatureSystem', () => {
  it('routes a pf2e_ slug to pf2e', () => {
    expect(resolveCreatureSystem('pf2e_b1--goblin', [])).toBe('pf2e');
  });

  it('routes a plain slug to 5e', () => {
    expect(resolveCreatureSystem('5.1_srd--goblin', [])).toBe('5e');
  });

  it('routes a custom monster by its stored gameSystem, not the slug prefix', () => {
    expect(resolveCreatureSystem('custom-goblin-abc', customs)).toBe('pf2e');
    expect(resolveCreatureSystem('custom-orc-def', customs)).toBe('5e');
  });

  it('defaults a custom monster with no gameSystem to 5e', () => {
    expect(resolveCreatureSystem('custom-x', [{ slug: 'custom-x' }])).toBe('5e');
  });
});

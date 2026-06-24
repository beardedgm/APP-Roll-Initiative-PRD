import { describe, it, expect } from 'vitest';
import { computeStaleSlugs, exceedsDeleteGuard } from '../../scripts/seedCore.js';

describe('computeStaleSlugs', () => {
  it('returns DB slugs that have no on-disk file', () => {
    const onDisk = new Set(['a', 'b']);
    const dbSlugs = ['a', 'b', 'c', 'd'];
    expect(computeStaleSlugs(onDisk, dbSlugs).sort()).toEqual(['c', 'd']);
  });
});

describe('exceedsDeleteGuard', () => {
  it('trips when deletions exceed the threshold of the DB count', () => {
    expect(exceedsDeleteGuard(30, 100, 0.10)).toBe(true);
    expect(exceedsDeleteGuard(5, 100, 0.10)).toBe(false);
  });
  it('never trips on an empty DB', () => {
    expect(exceedsDeleteGuard(0, 0, 0.10)).toBe(false);
  });
});

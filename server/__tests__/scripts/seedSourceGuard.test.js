import { describe, it, expect } from 'vitest';
import { missingDirs } from '../../scripts/seedCore.js';

// H3: a configured source folder that is missing must hard-abort the seed
// before any write or reconcile — otherwise stale-record reconciliation
// silently deletes that folder's whole book (most single books fall under
// the 10% mass-delete guard, so the guard alone does not protect them).
describe('missingDirs', () => {
  it('returns only the paths that do not exist', () => {
    const exists = p => p === '/content/a';
    expect(missingDirs(['/content/a', '/content/b', '/content/c'], exists))
      .toEqual(['/content/b', '/content/c']);
  });

  it('returns an empty array when every path exists', () => {
    expect(missingDirs(['/x', '/y'], () => true)).toEqual([]);
  });

  it('returns everything when nothing exists', () => {
    expect(missingDirs(['/x', '/y'], () => false)).toEqual(['/x', '/y']);
  });

  it('handles an empty path list', () => {
    expect(missingDirs([], () => false)).toEqual([]);
  });
});

import { describe, it, expect } from 'vitest';
import { parseArgs } from '../../scripts/seedCore.js';

// l14: a typo'd flag (e.g. --dryrun) was silently ignored, so a run intended as a
// dry run executed a REAL, destructive seed. Reject unknown flags instead.
describe('parseArgs', () => {
  it('parses the known flags', () => {
    expect(parseArgs(['--dry-run'])).toMatchObject({ dryRun: true, failOnInvalid: false });
    expect(parseArgs(['--fail-on-invalid'])).toMatchObject({ dryRun: false, failOnInvalid: true });
    expect(parseArgs(['--dry-run', '--fail-on-invalid'])).toMatchObject({ dryRun: true, failOnInvalid: true });
    expect(parseArgs([])).toMatchObject({ dryRun: false, failOnInvalid: false });
  });

  it('throws on an unknown/typo flag rather than silently running a real seed', () => {
    expect(() => parseArgs(['--dryrun'])).toThrow(/unknown/i);
    expect(() => parseArgs(['--dry-runn'])).toThrow();
    expect(() => parseArgs(['--nope'])).toThrow();
  });
});

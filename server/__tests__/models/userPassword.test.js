import { describe, it, expect } from 'vitest';
import User from '../../models/User.js';

// l8: the login route returned 401 for an unknown email WITHOUT running scrypt,
// so unknown emails responded faster than known-email-wrong-password — a timing
// oracle for enumerating valid accounts. verifyPasswordDummy runs an equal-cost
// scrypt (always false) so the unknown-email path takes the same time.
describe('User password helpers', () => {
  it('hashPassword + verifyPassword round-trip', async () => {
    const { hashedPassword, salt } = await User.hashPassword('correct horse battery');
    const u = new User({ email: 'a@b.co', displayName: 'A', hashedPassword, salt });
    expect(await u.verifyPassword('correct horse battery')).toBe(true);
    expect(await u.verifyPassword('wrong')).toBe(false);
  });

  it('verifyPasswordDummy always resolves false', async () => {
    expect(await User.verifyPasswordDummy('anything')).toBe(false);
    expect(await User.verifyPasswordDummy('')).toBe(false);
  });
});

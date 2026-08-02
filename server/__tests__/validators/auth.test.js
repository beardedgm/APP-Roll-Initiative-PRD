import { describe, it, expect } from 'vitest';
import {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
  updateProfileSchema,
  deleteAccountSchema,
} from '../../validators/auth.js';

describe('registerSchema', () => {
  const valid = {
    email: 'test@example.com',
    password: 'password123',
    displayName: 'Test User',
    turnstileToken: 'token',
  };

  it('accepts valid registration', () => {
    expect(registerSchema.safeParse(valid).success).toBe(true);
  });

  it('rejects missing email', () => {
    const { email: _email, ...rest } = valid;
    expect(registerSchema.safeParse(rest).success).toBe(false);
  });

  it('rejects malformed email', () => {
    expect(registerSchema.safeParse({ ...valid, email: 'not-an-email' }).success).toBe(false);
  });

  it('rejects email longer than 255 chars', () => {
    const longEmail = `${'a'.repeat(260)}@b.co`;
    expect(registerSchema.safeParse({ ...valid, email: longEmail }).success).toBe(false);
  });

  it('rejects password shorter than 8 chars', () => {
    expect(registerSchema.safeParse({ ...valid, password: 'short' }).success).toBe(false);
  });

  it('rejects password longer than 128 chars', () => {
    expect(registerSchema.safeParse({ ...valid, password: 'a'.repeat(129) }).success).toBe(false);
  });

  it('rejects empty displayName', () => {
    expect(registerSchema.safeParse({ ...valid, displayName: '' }).success).toBe(false);
  });

  it('rejects displayName longer than 50 chars', () => {
    expect(registerSchema.safeParse({ ...valid, displayName: 'a'.repeat(51) }).success).toBe(false);
  });

  it('trims whitespace on displayName', () => {
    const result = registerSchema.safeParse({ ...valid, displayName: '  Hero  ' });
    expect(result.success).toBe(true);
    expect(result.data.displayName).toBe('Hero');
  });

  it('treats turnstileToken as optional', () => {
    const { turnstileToken: _t, ...rest } = valid;
    expect(registerSchema.safeParse(rest).success).toBe(true);
  });

  it('rejects object in email field (NoSQL injection attempt)', () => {
    expect(registerSchema.safeParse({ ...valid, email: { $gt: '' } }).success).toBe(false);
  });
});

describe('loginSchema', () => {
  const valid = {
    email: 'test@example.com',
    password: 'password123',
    turnstileToken: 'token',
  };

  it('accepts valid login', () => {
    expect(loginSchema.safeParse(valid).success).toBe(true);
  });

  it('rejects missing password', () => {
    const { password: _p, ...rest } = valid;
    expect(loginSchema.safeParse(rest).success).toBe(false);
  });

  it('allows shorter password than register (login validates against stored hash)', () => {
    // Register requires min 8, but login accepts min 1 — old accounts may have 1+ chars.
    expect(loginSchema.safeParse({ ...valid, password: 'a' }).success).toBe(true);
  });

  it('rejects password longer than 128 chars', () => {
    expect(loginSchema.safeParse({ ...valid, password: 'a'.repeat(129) }).success).toBe(false);
  });
});

describe('forgotPasswordSchema', () => {
  it('accepts valid email', () => {
    expect(forgotPasswordSchema.safeParse({ email: 'a@b.co', turnstileToken: 't' }).success).toBe(true);
  });

  it('rejects malformed email', () => {
    expect(forgotPasswordSchema.safeParse({ email: 'no-at-sign', turnstileToken: 't' }).success).toBe(false);
  });
});

describe('resetPasswordSchema', () => {
  it('accepts valid token + password', () => {
    expect(resetPasswordSchema.safeParse({ token: 'abc', password: 'password123' }).success).toBe(true);
  });

  it('rejects empty token', () => {
    expect(resetPasswordSchema.safeParse({ token: '', password: 'password123' }).success).toBe(false);
  });

  it('rejects short password', () => {
    expect(resetPasswordSchema.safeParse({ token: 'abc', password: 'short' }).success).toBe(false);
  });
});

describe('changePasswordSchema', () => {
  it('accepts valid current + new password', () => {
    expect(changePasswordSchema.safeParse({ currentPassword: 'old', newPassword: 'newpassword' }).success).toBe(true);
  });

  it('rejects empty currentPassword', () => {
    expect(changePasswordSchema.safeParse({ currentPassword: '', newPassword: 'newpassword' }).success).toBe(false);
  });

  it('rejects short newPassword', () => {
    expect(changePasswordSchema.safeParse({ currentPassword: 'old', newPassword: 'short' }).success).toBe(false);
  });
});

describe('updateProfileSchema', () => {
  it('accepts valid displayName', () => {
    expect(updateProfileSchema.safeParse({ displayName: 'NewName' }).success).toBe(true);
  });

  it('trims displayName', () => {
    const result = updateProfileSchema.safeParse({ displayName: '  Trimmed  ' });
    expect(result.success).toBe(true);
    expect(result.data.displayName).toBe('Trimmed');
  });
});

describe('deleteAccountSchema', () => {
  it('accepts valid password', () => {
    expect(deleteAccountSchema.safeParse({ password: 'something' }).success).toBe(true);
  });

  it('rejects empty password', () => {
    expect(deleteAccountSchema.safeParse({ password: '' }).success).toBe(false);
  });
});

// M8: Zod runs checks in declaration order, so .min(1).max(50).trim()
// validated the UNTRIMMED input — "   " passed min(1) then trimmed to "",
// creating users with empty display names ("Welcome aboard, !"). And a
// 50-char name padded with spaces was rejected by max(50) despite trimming
// to a valid length. .trim() must come first.
describe('trim-before-min ordering (M8)', () => {
  it('rejects whitespace-only displayName on register', () => {
    const result = registerSchema.safeParse({
      email: 'a@b.co', password: 'password123', displayName: '   ',
    });
    expect(result.success).toBe(false);
  });

  it('rejects whitespace-only displayName on profile update', () => {
    expect(updateProfileSchema.safeParse({ displayName: '\t  \n' }).success).toBe(false);
  });

  it('accepts a max-length displayName padded with whitespace', () => {
    const padded = `  ${'a'.repeat(50)}  `;
    const result = updateProfileSchema.safeParse({ displayName: padded });
    expect(result.success).toBe(true);
    expect(result.data.displayName).toBe('a'.repeat(50));
  });
});

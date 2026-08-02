import { z } from 'zod';

export const registerSchema = z.object({
  email: z.string().email('Invalid email address').max(255),
  password: z.string().min(8, 'Password must be at least 8 characters').max(128),
  displayName: z.string().trim().min(1, 'Display name is required').max(50),
  turnstileToken: z.string().nullish(),
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email address').max(255),
  password: z.string().min(1, 'Password is required').max(128),
  turnstileToken: z.string().nullish(),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address').max(255),
  turnstileToken: z.string().nullish(),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Token is required'),
  password: z.string().min(8, 'Password must be at least 8 characters').max(128),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'Password must be at least 8 characters').max(128),
});

export const updateProfileSchema = z.object({
  displayName: z.string().trim().min(1, 'Display name is required').max(50),
});

export const deleteAccountSchema = z.object({
  password: z.string().min(1, 'Password is required'),
});

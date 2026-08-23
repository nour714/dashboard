/**
 * AfricaTravel - Authentication Request Schemas
 */

import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('Valid work email is required').trim(),
  password: z.string().min(1, 'Password is required')
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required').optional()
});

export const updateProfileSchema = z.object({
  name: z.string().min(1, 'Name cannot be empty').optional(),
  email: z.string().email('Valid work email is required').optional(),
  title: z.string().optional(),
  phone: z.string().optional()
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(6, 'New password must be at least 6 characters')
});

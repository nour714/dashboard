/**
 * AfricaTravel - Authentication Request Schemas
 */

import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('Valid work email is required').max(255).trim(),
  password: z.string().min(1, 'Password is required').max(128),
  rememberMe: z.boolean().optional().default(true)
});

export const refreshTokenSchema = z.object({}).strict().optional().default({});

export const updateProfileSchema = z.object({
  name: z.string().min(1, 'Name cannot be empty').max(150).optional(),
  email: z.string().email('Valid work email is required').max(255).optional(),
  title: z.string().max(100).optional(),
  phone: z.string().max(30).optional()
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required').max(128),
  newPassword: z.string().min(12, 'New password must be at least 12 characters').max(128)
});

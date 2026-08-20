/**
 * AfricaTravel - Employee Request Schemas
 */

import { z } from 'zod';

export const createEmployeeSchema = z.object({
  name: z.string().min(1, 'Name is required').trim(),
  email: z.string().email('Valid work email is required').trim(),
  role: z.enum(['ADMIN', 'AGENT']).default('AGENT'),
  title: z.string().optional(),
  password: z.string().min(6, 'Password must be at least 6 characters').default('password123'),
  status: z.enum(['ACTIVE', 'INACTIVE']).default('ACTIVE')
});

export const updateEmployeeSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  role: z.enum(['ADMIN', 'AGENT']).optional(),
  title: z.string().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
  password: z.string().min(6).optional()
});

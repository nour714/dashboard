/**
 * AfricaTravel - Employee Request Schemas
 */

import { z } from 'zod';

export const createEmployeeSchema = z.object({
  name: z.string().min(1, 'Name is required').trim(),
  email: z.string().email('Valid work email is required').trim(),
  role: z.enum(['ADMIN', 'AGENT', 'TICKET_ONLY']).default('AGENT'),
  title: z.string().optional(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  status: z.enum(['ACTIVE', 'INACTIVE']).default('ACTIVE')
});

export const updateEmployeeSchema = z.object({
  name: z.string().min(1).trim().optional(),
  email: z.string().email().trim().optional(),
  role: z.enum(['ADMIN', 'AGENT', 'TICKET_ONLY']).optional(),
  title: z.string().trim().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE']).optional()
});

export const deleteEmployeeSchema = z.object({
  confirmEmployeeId: z.string().min(1, 'confirmEmployeeId is required')
});

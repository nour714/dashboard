/**
 * AfricaTravel - Employee Request Schemas
 */

import { z } from 'zod';

export const createEmployeeSchema = z.object({
  name: z.string().min(1, 'Name is required').max(150, 'Name is too long').trim(),
  email: z.string().email('Valid work email is required').max(255).trim(),
  role: z.enum(['ADMIN', 'AGENT', 'TICKET_ONLY']).default('AGENT'),
  title: z.string().max(100).optional(),
  password: z.string().min(12, 'Password must be at least 12 characters').max(128, 'Password is too long'),
  status: z.enum(['ACTIVE', 'INACTIVE']).default('ACTIVE')
});

export const updateEmployeeSchema = z.object({
  name: z.string().min(1).max(150).trim().optional(),
  email: z.string().email().max(255).trim().optional(),
  role: z.enum(['ADMIN', 'AGENT', 'TICKET_ONLY']).optional(),
  title: z.string().max(100).trim().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE']).optional()
});

export const deleteEmployeeSchema = z.object({
  confirmEmployeeId: z.string().min(1, 'confirmEmployeeId is required').max(100).trim()
});

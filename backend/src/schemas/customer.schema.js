/**
 * AfricaTravel - Customer Request Schemas
 */

import { z } from 'zod';

export const createCustomerSchema = z.object({
  name: z.string().min(1, 'Customer name is required').max(150, 'Customer name is too long').trim(),
  email: z.string().email('Invalid email address').max(255).optional().or(z.literal('')),
  phone: z.string().max(30).optional(),
  passport: z.string().max(30).optional(),
  nationality: z.string().max(100).default('Egyptian (EGY)'),
  isVip: z.boolean().default(false),
  initialNote: z.string().max(1000).optional()
});

export const updateCustomerSchema = z.object({
  name: z.string().min(1).max(150).optional(),
  email: z.string().email().max(255).optional().or(z.literal('')),
  phone: z.string().max(30).optional(),
  passport: z.string().max(30).optional(),
  nationality: z.string().max(100).optional(),
  isVip: z.boolean().optional()
});

export const addCustomerNoteSchema = z.object({
  text: z.string().min(1, 'Note text cannot be empty').max(2000, 'Note text is too long').trim()
});

export const queryCustomersSchema = z.object({
  q: z.string().max(100, 'Search query too long').optional(),
  search: z.string().max(100, 'Search query too long').optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(50)
});

export const addCustomerPurgeConfirmSchema = z.object({
  confirmCustomerId: z.string().min(1, 'confirmCustomerId is required').max(100).trim()
});

export const purgeCustomerConfirmSchema = addCustomerPurgeConfirmSchema;

/**
 * AfricaTravel - Customer Request Schemas
 */

import { z } from 'zod';

export const createCustomerSchema = z.object({
  name: z.string().min(1, 'Customer name is required').trim(),
  email: z.string().email('Invalid email address').optional().or(z.literal('')),
  phone: z.string().optional(),
  passport: z.string().optional(),
  nationality: z.string().default('Egyptian (EGY)'),
  isVip: z.boolean().default(false),
  initialNote: z.string().optional()
});

export const updateCustomerSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional(),
  passport: z.string().optional(),
  nationality: z.string().optional(),
  isVip: z.boolean().optional()
});

export const addCustomerNoteSchema = z.object({
  text: z.string().min(1, 'Note text cannot be empty').trim()
});

export const queryCustomersSchema = z.object({
  q: z.string().optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(50)
});

export const addCustomerPurgeConfirmSchema = z.object({
  confirmCustomerId: z.string().min(1, 'confirmCustomerId is required').trim()
});

export const purgeCustomerConfirmSchema = addCustomerPurgeConfirmSchema;

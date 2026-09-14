/**
 * AfricaTravel — Office Expenses Request Validation Schemas
 */

import { z } from 'zod';

export const createExpenseSchema = z.object({
  category: z.enum(['SERVICES', 'TRANSFERS'], {
    errorMap: () => ({ message: 'Category must be either SERVICES or TRANSFERS' })
  }),
  amount: z.coerce.number().positive('Amount must be greater than zero'),
  currency: z.string().max(10).default('EGP'),
  description: z.string().trim().min(1, 'Description is required').max(500, 'Description is too long'),
  date: z.string().trim().min(1, 'Date is required').max(50)
});

export const queryExpensesSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(25),
  category: z.enum(['SERVICES', 'TRANSFERS']).optional(),
  startDate: z.string().max(50).optional(),
  endDate: z.string().max(50).optional()
});

export const updateExpenseSchema = z.object({
  category: z.enum(['SERVICES', 'TRANSFERS'], {
    errorMap: () => ({ message: 'Category must be either SERVICES or TRANSFERS' })
  }).optional(),
  amount: z.coerce.number().positive('Amount must be greater than zero').optional(),
  currency: z.string().max(10).optional(),
  description: z.string().trim().min(1, 'Description is required').max(500, 'Description is too long').optional(),
  date: z.string().trim().min(1, 'Date is required').max(50).optional()
}).refine(data => Object.keys(data).length > 0, {
  message: 'At least one field must be provided for update'
});

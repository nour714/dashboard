/**
 * AfricaTravel — Office Expenses Request Validation Schemas
 */

import { z } from 'zod';
import { money } from './common.schema.js';

const validDateString = z.string().trim().min(1, 'Date is required').max(50)
  .refine(val => !isNaN(new Date(val).getTime()), {
    message: 'Invalid date format'
  });

const optionalValidDateString = z.string().max(50).optional()
  .refine(val => !val || !isNaN(new Date(val).getTime()), {
    message: 'Invalid date format'
  });

export const createExpenseSchema = z.object({
  category: z.enum(['SERVICES', 'TRANSFERS'], {
    errorMap: () => ({ message: 'Category must be either SERVICES or TRANSFERS' })
  }),
  amount: money({ positive: true }),
  currency: z.string().max(10).optional(),
  description: z.string().trim().min(1, 'Description is required').max(500, 'Description is too long'),
  date: validDateString
});

export const queryExpensesSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(25),
  category: z.enum(['SERVICES', 'TRANSFERS']).optional(),
  startDate: optionalValidDateString,
  endDate: optionalValidDateString
});

export const updateExpenseSchema = z.object({
  category: z.enum(['SERVICES', 'TRANSFERS'], {
    errorMap: () => ({ message: 'Category must be either SERVICES or TRANSFERS' })
  }).optional(),
  amount: money({ positive: true }).optional(),
  currency: z.string().max(10).optional(),
  description: z.string().trim().min(1, 'Description is required').max(500, 'Description is too long').optional(),
  date: validDateString.optional()
}).refine(data => Object.keys(data).length > 0, {
  message: 'At least one field must be provided for update'
});

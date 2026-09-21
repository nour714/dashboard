/**
 * AfricaTravel - Refund Request Schema
 */

import { z } from 'zod';
import { money, strictBoolean } from './common.schema.js';

export const addRefundSchema = z.object({
  amount: money({ positive: true }),
  airlineRefundAmount: money({ min: 0 }).default(0),
  costPrice: money({ min: 0 }).optional().nullable(),
  isCompletedCancellation: strictBoolean().optional(),
  currency: z.string().max(10).optional(),
  reason: z.string().min(1, 'Refund reason is required').max(500, 'Reason is too long').trim(),
  status: z.enum(['COMPLETED', 'APPROVED', 'PENDING', 'REJECTED']).default('COMPLETED')
});

export const updateRefundSchema = z.object({
  status: z.enum(['APPROVED', 'COMPLETED', 'REJECTED'], {
    errorMap: () => ({ message: 'Status must be APPROVED, COMPLETED, or REJECTED' })
  })
});

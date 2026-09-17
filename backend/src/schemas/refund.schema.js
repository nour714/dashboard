/**
 * AfricaTravel - Refund Request Schema
 */

import { z } from 'zod';

export const addRefundSchema = z.object({
  amount: z.coerce.number().positive('Refund amount must be greater than zero'),
  airlineRefundAmount: z.coerce.number().nonnegative('Airline refund amount cannot be negative').default(0),
  costPrice: z.coerce.number().nonnegative('Cost price cannot be negative').optional(),
  isCompletedCancellation: z.coerce.boolean().optional(),
  currency: z.string().max(10).default('EGP'),
  reason: z.string().min(1, 'Refund reason is required').max(500, 'Reason is too long').trim(),
  status: z.enum(['COMPLETED', 'APPROVED', 'PENDING', 'REJECTED']).default('COMPLETED')
});

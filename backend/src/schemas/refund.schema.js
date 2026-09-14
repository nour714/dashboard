/**
 * AfricaTravel - Refund Request Schema
 */

import { z } from 'zod';

export const addRefundSchema = z.object({
  amount: z.coerce.number().positive('Refund amount must be greater than zero'),
  currency: z.string().max(10).default('EGP'),
  reason: z.string().min(1, 'Refund reason is required').max(500, 'Reason is too long').trim(),
  status: z.enum(['COMPLETED', 'APPROVED', 'PENDING', 'REJECTED']).default('COMPLETED')
});

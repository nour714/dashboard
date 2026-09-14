/**
 * AfricaTravel - Payment Request Schema
 */

import { z } from 'zod';

export const addPaymentSchema = z.object({
  amount: z.coerce.number().positive('Payment amount must be greater than zero'),
  currency: z.string().max(10).default('EGP'),
  method: z.string().min(1, 'Payment method is required').max(50).default('Credit Card'),
  reference: z.string().max(100).optional(),
  date: z.string().max(50).optional(),
  notes: z.string().max(2000).optional()
});

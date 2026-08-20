/**
 * AfricaTravel - Payment Request Schema
 */

import { z } from 'zod';

export const addPaymentSchema = z.object({
  amount: z.coerce.number().positive('Payment amount must be greater than zero'),
  currency: z.string().default('EGP'),
  method: z.string().min(1, 'Payment method is required').default('Credit Card'),
  reference: z.string().optional(),
  date: z.string().optional(),
  notes: z.string().optional()
});

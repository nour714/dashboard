/**
 * AfricaTravel - Payment Request Schema
 */

import { z } from 'zod';
import { money } from './common.schema.js';

export const addPaymentSchema = z.object({
  amount: money({ positive: true }),
  type: z.enum(['TICKET', 'MODIFICATION']).default('TICKET'),
  currency: z.string().max(10).optional(),
  method: z.string().min(1, 'Payment method is required').max(50).default('Credit Card'),
  reference: z.string().max(100).optional(),
  date: z.string().max(50).optional(),
  notes: z.string().max(2000).optional()
});

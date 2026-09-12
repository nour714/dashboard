/**
 * AfricaTravel - Audit Activity Query Validation Schemas
 */

import { z } from 'zod';

export const queryLogsSchema = z.object({
  user: z.string().max(100).optional(),
  action: z.string().max(100).optional(),
  ticketId: z.string().max(100).optional(),
  customerId: z.string().max(100).optional(),
  fromDate: z.string().max(50).optional(),
  toDate: z.string().max(50).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(50)
});

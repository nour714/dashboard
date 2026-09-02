/**
 * AfricaTravel - Audit Activity Query Validation Schemas
 */

import { z } from 'zod';

export const queryLogsSchema = z.object({
  user: z.string().optional(),
  action: z.string().optional(),
  ticketId: z.string().optional(),
  customerId: z.string().optional(),
  fromDate: z.string().optional(),
  toDate: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(50)
});

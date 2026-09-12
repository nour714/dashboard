/**
 * AfricaTravel - Flight Modification Request Schema
 */

import { z } from 'zod';

export const addModificationSchema = z.object({
  flightNumber: z.string().max(30).optional(),
  newDepartureDate: z.string().min(1, 'New departure date is required').max(50),
  newArrivalDate: z.string().max(50).optional(),
  changeFee: z.coerce.number().nonnegative('Change fee cannot be negative').default(0),
  reason: z.string().min(1, 'Modification reason is required').max(500, 'Reason is too long').trim(),
  note: z.string().max(2000).optional(),
  requestedBy: z.string().max(150).optional()
});

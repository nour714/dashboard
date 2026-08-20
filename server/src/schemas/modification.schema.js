/**
 * AfricaTravel - Flight Modification Request Schema
 */

import { z } from 'zod';

export const addModificationSchema = z.object({
  flightNumber: z.string().optional(),
  newDepartureDate: z.string().min(1, 'New departure date is required'),
  newArrivalDate: z.string().optional(),
  changeFee: z.coerce.number().nonnegative('Change fee cannot be negative').default(0),
  reason: z.string().min(1, 'Modification reason is required').trim(),
  note: z.string().optional(),
  requestedBy: z.string().optional()
});

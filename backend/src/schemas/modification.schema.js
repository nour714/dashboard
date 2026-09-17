/**
 * AfricaTravel - Flight Modification Request Schema
 */

import { z } from 'zod';

export const addModificationSchema = z.object({
  flightNumber: z.string().max(30).optional(),
  returnFlightNumber: z.string().max(30).optional(),
  newDepartureDate: z.string().max(50).optional(),
  newArrivalDate: z.string().max(50).optional(),
  newReturnDepartureDate: z.string().max(50).optional(),
  newReturnArrivalDate: z.string().max(50).optional(),
  changeFee: z.coerce.number().nonnegative('Change fee cannot be negative').default(0),
  airlineFee: z.coerce.number().nonnegative('Airline fee cannot be negative').default(0),
  collectedNow: z.coerce.boolean().default(false),
  paymentMethod: z.string().max(50).default('Cash'),
  reason: z.string().min(1, 'Modification reason is required').max(500, 'Reason is too long').trim(),
  note: z.string().max(2000).optional(),
  requestedBy: z.string().max(150).optional()
}).refine(data => Boolean(data.newDepartureDate || data.newReturnDepartureDate), {
  message: 'At least one flight date (departure or return) must be provided',
  path: ['newDepartureDate']
});

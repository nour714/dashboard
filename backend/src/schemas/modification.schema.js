/**
 * AfricaTravel - Flight Modification Request Schema
 */

import { z } from 'zod';
import { money, strictBoolean } from './common.schema.js';

export const addModificationSchema = z.object({
  flightNumber: z.string().max(30).optional(),
  returnFlightNumber: z.string().max(30).optional(),
  newDepartureDate: z.string().max(50).optional(),
  newArrivalDate: z.string().max(50).optional(),
  newReturnDepartureDate: z.string().max(50).optional(),
  newReturnArrivalDate: z.string().max(50).optional(),
  changeFee: money({ min: 0 }).default(0),
  airlineFee: money({ min: 0 }).default(0),
  collectedNow: strictBoolean().default(false),
  paymentMethod: z.string().max(50).default('Cash'),
  reason: z.string().min(1, 'Modification reason is required').max(500, 'Reason is too long').trim(),
  note: z.string().max(2000).optional(),
  requestedBy: z.string().max(150).optional()
}).refine(data => Boolean(data.newDepartureDate || data.newReturnDepartureDate), {
  message: 'At least one flight date (departure or return) must be provided',
  path: ['newDepartureDate']
});

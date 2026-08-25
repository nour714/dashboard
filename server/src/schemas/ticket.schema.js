/**
 * AfricaTravel - Ticket Validation Schemas
 */

import { z } from 'zod';

export const createTicketSchema = z.object({
  customerId: z.string().optional(),
  passengerName: z.string().min(1, 'Passenger name is required').trim(),
  pnr: z.string().min(1, 'PNR is required').max(10),
  ticketNumber: z.string().optional(),
  phone: z.string().optional(),
  passport: z.string().optional(),
  nationality: z.string().optional(),
  dob: z.string().optional(),
  email: z.string().email('Invalid passenger email format').optional().or(z.literal('')),
  airline: z.string().min(1, 'Airline is required').default('EgyptAir'),
  airlineCode: z.string().min(1, 'Airline code is required').default('MS'),
  flightNumber: z.string().min(1, 'Flight number is required'),
  returnFlightNumber: z.string().optional(),
  origin: z.string().min(1, 'Flight origin is required').trim(),
  originTerminal: z.string().optional(),
  originAirportName: z.string().optional(),
  destination: z.string().min(1, 'Flight destination is required').trim(),
  destinationTerminal: z.string().optional(),
  destinationAirportName: z.string().optional(),
  departureDate: z.string().min(1, 'Departure date is required'),
  arrivalDate: z.string().min(1, 'Arrival date is required'),
  returnDepartureDate: z.string().optional(),
  returnArrivalDate: z.string().optional(),
  tripType: z.enum(['One Way', 'Round Trip', 'Multi City']).default('One Way'),
  flightDuration: z.string().optional(),
  cabinClass: z.enum(['Economy (Y)', 'Business (J)', 'First (F)']).default('Economy (Y)'),
  seat: z.string().optional(),
  baggage: z.string().optional(),
  ticketPrice: z.coerce.number().positive('Ticket price must be greater than zero'),
  currency: z.string().default('EGP'),
  initialPayment: z.coerce.number().nonnegative('Initial payment cannot be negative').optional(),
  paymentMethod: z.string().optional(),
  paymentReference: z.string().optional(),
  paymentDate: z.string().optional()
}).superRefine((data, ctx) => {
  if (data.tripType === 'Round Trip') {
    if (!data.returnFlightNumber) {
      ctx.addIssue({ code: 'custom', path: ['returnFlightNumber'], message: 'Return flight number is required for round trip tickets' });
    }
    if (!data.returnDepartureDate) {
      ctx.addIssue({ code: 'custom', path: ['returnDepartureDate'], message: 'Return departure date is required for round trip tickets' });
    }
    if (!data.returnArrivalDate) {
      ctx.addIssue({ code: 'custom', path: ['returnArrivalDate'], message: 'Return arrival date is required for round trip tickets' });
    }
  }
});

export const updateTicketSchema = z.object({
  passengerName: z.string().min(1).optional(),
  pnr: z.string().min(1).max(10).optional(),
  ticketNumber: z.string().optional(),
  phone: z.string().optional(),
  passport: z.string().optional(),
  nationality: z.string().optional(),
  dob: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  airline: z.string().optional(),
  airlineCode: z.string().optional(),
  flightNumber: z.string().optional(),
  returnFlightNumber: z.string().optional(),
  origin: z.string().optional(),
  originTerminal: z.string().optional(),
  originAirportName: z.string().optional(),
  destination: z.string().optional(),
  destinationTerminal: z.string().optional(),
  destinationAirportName: z.string().optional(),
  departureDate: z.string().optional(),
  arrivalDate: z.string().optional(),
  returnDepartureDate: z.string().optional(),
  returnArrivalDate: z.string().optional(),
  tripType: z.string().optional(),
  flightDuration: z.string().optional(),
  cabinClass: z.string().optional(),
  seat: z.string().optional(),
  baggage: z.string().optional(),
  status: z.enum([
    'CONFIRMED',
    'ISSUED',
    'BOOKED',
    'PAID',
    'PAID IN FULL',
    'PARTIALLY PAID',
    'PENDING',
    'PENDING PAY',
    'MODIFIED',
    'REFUND REQUESTED',
    'PARTIALLY_REFUNDED',
    'REFUNDED',
    'CANCELLED'
  ]).optional()
});

export const queryTicketsSchema = z.object({
  search: z.string().optional(),
  status: z.string().optional(),
  airline: z.string().optional(),
  travelDate: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(50)
});

export const addPurgeConfirmSchema = z.object({
  confirmTicketId: z.string().min(1, 'confirmTicketId is required').trim()
});

export const purgeTicketConfirmSchema = addPurgeConfirmSchema;

/**
 * AfricaTravel - Ticket Validation Schemas
 */

import { z } from 'zod';

export const createTicketSchema = z.object({
  customerId: z.string().optional(),
  passengerName: z.string().trim().optional().default(''),
  pnr: z.string().max(10).optional(),
  ticketNumber: z.string().optional(),
  phone: z.string().optional(),
  passport: z.string().optional(),
  nationality: z.string().optional(),
  dob: z.string().optional(),
  email: z.string().email('Invalid passenger email format').optional().or(z.literal('')),
  airline: z.string().optional().default('EgyptAir'),
  airlineCode: z.string().optional().default('MS'),
  flightNumber: z.string().optional().default('MS 901'),
  returnFlightNumber: z.string().optional(),
  origin: z.string().trim().optional().default(''),
  originTerminal: z.string().optional(),
  originAirportName: z.string().optional(),
  destination: z.string().trim().optional().default(''),
  destinationTerminal: z.string().optional(),
  destinationAirportName: z.string().optional(),
  departureDate: z.string().optional(),
  arrivalDate: z.string().optional(),
  returnDepartureDate: z.string().optional(),
  returnArrivalDate: z.string().optional(),
  tripType: z.enum(['One Way', 'Round Trip', 'Multi City']).default('One Way'),
  flightDuration: z.string().optional(),
  cabinClass: z.enum(['Economy (Y)', 'Business (J)', 'First (F)']).default('Economy (Y)'),
  seat: z.string().optional(),
  baggage: z.string().optional(),
  ticketPrice: z.coerce.number().nonnegative('Ticket price cannot be negative').default(0),
  costPrice: z.coerce.number().nonnegative('Cost price cannot be negative').default(0).optional(),
  currency: z.string().default('EGP'),
  initialPayment: z.coerce.number().nonnegative('Initial payment cannot be negative').optional(),
  paymentMethod: z.string().optional(),
  paymentReference: z.string().optional(),
  paymentDate: z.string().optional()
}).superRefine((data, ctx) => {
  // Round trip is now inferred: if returnDepartureDate is provided, treat as round trip
  const isRoundTrip = Boolean(data.returnDepartureDate);

  if (isRoundTrip) {
    // Flexible validation: only checks return is after departure, no year restriction
    if (data.departureDate && new Date(data.returnDepartureDate) <= new Date(data.departureDate)) {
      ctx.addIssue({ code: 'custom', path: ['returnDepartureDate'], message: 'Return departure date must be after the outbound departure date' });
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
  costPrice: z.coerce.number().nonnegative('Cost price cannot be negative').optional(),
  status: z.enum([
    'CONFIRMED',
    'PARTIALLY PAID',
    'UNPAID',
    'PAID',
    'PAID IN FULL',
    'PENDING',
    'PENDING PAY',
    'PENDING PAYMENT',
    'ISSUED',
    'BOOKED',
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

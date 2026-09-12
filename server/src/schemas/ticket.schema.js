/**
 * AfricaTravel - Ticket Validation Schemas
 */

import { z } from 'zod';

export const createTicketSchema = z.object({
  customerId: z.string().max(100).optional(),
  passengerName: z.string().trim().max(150, 'Passenger name is too long').optional().default(''),
  pnr: z.string().max(10).optional(),
  ticketNumber: z.string().max(50).nullable().optional().or(z.literal('')),
  phone: z.string().max(30).optional(),
  passport: z.string().max(30).optional(),
  nationality: z.string().max(100).optional(),
  dob: z.string().max(50).optional(),
  email: z.string().email('Invalid passenger email format').max(255).optional().or(z.literal('')),
  airline: z.string().max(100).optional().default('EgyptAir'),
  airlineCode: z.string().max(10).optional().default('MS'),
  flightNumber: z.string().max(20).optional().default('MS 901'),
  returnFlightNumber: z.string().max(20).optional(),
  origin: z.string().trim().max(100).optional().default(''),
  originTerminal: z.string().max(50).optional(),
  originAirportName: z.string().max(100).optional(),
  destination: z.string().trim().max(100).optional().default(''),
  destinationTerminal: z.string().max(50).optional(),
  destinationAirportName: z.string().max(100).optional(),
  departureDate: z.string().optional(),
  arrivalDate: z.string().optional(),
  returnDepartureDate: z.string().optional(),
  returnArrivalDate: z.string().optional(),
  tripType: z.enum(['One Way', 'Round Trip', 'Multi City']).default('One Way'),
  flightDuration: z.string().max(50).optional(),
  cabinClass: z.enum(['Economy (Y)', 'Business (J)', 'First (F)']).default('Economy (Y)'),
  seat: z.string().max(20).optional(),
  baggage: z.string().max(50).optional(),
  ticketPrice: z.coerce.number().nonnegative('Ticket price cannot be negative').default(0),
  costPrice: z.coerce.number().nonnegative('Cost price cannot be negative').default(0).optional(),
  currency: z.string().max(10).default('EGP'),
  initialPayment: z.coerce.number().nonnegative('Initial payment cannot be negative').optional(),
  paymentMethod: z.string().max(50).optional(),
  paymentReference: z.string().max(100).optional(),
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
  passengerName: z.string().min(1).max(150).optional(),
  pnr: z.string().min(1).max(10).optional(),
  ticketNumber: z.string().max(50).nullable().optional().or(z.literal('')),
  phone: z.string().max(30).optional(),
  passport: z.string().max(30).optional(),
  nationality: z.string().max(100).optional(),
  dob: z.string().max(50).optional(),
  email: z.string().email().max(255).optional().or(z.literal('')),
  airline: z.string().max(100).optional(),
  airlineCode: z.string().max(10).optional(),
  flightNumber: z.string().max(20).optional(),
  returnFlightNumber: z.string().max(20).optional(),
  origin: z.string().max(100).optional(),
  originTerminal: z.string().max(50).optional(),
  originAirportName: z.string().max(100).optional(),
  destination: z.string().max(100).optional(),
  destinationTerminal: z.string().max(50).optional(),
  destinationAirportName: z.string().max(100).optional(),
  departureDate: z.string().nullable().optional().or(z.literal('')),
  arrivalDate: z.string().nullable().optional().or(z.literal('')),
  returnDepartureDate: z.string().nullable().optional().or(z.literal('')),
  returnArrivalDate: z.string().nullable().optional().or(z.literal('')),
  tripType: z.enum(['One Way', 'Round Trip', 'Multi City']).optional(),
  flightDuration: z.string().max(50).optional(),
  cabinClass: z.enum(['Economy (Y)', 'Business (J)', 'First (F)']).optional(),
  seat: z.string().max(20).optional(),
  baggage: z.string().max(50).optional(),
  costPrice: z.coerce.number().nonnegative('Cost price cannot be negative').optional(),
  ticketPrice: z.coerce.number().positive('Ticket price must be greater than zero').optional(),
  confirmPriceBelowPaid: z.boolean().optional(),
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
  search: z.string().max(100, 'Search query too long').optional(),
  status: z.string().max(50).optional(),
  airline: z.string().max(100).optional(),
  travelDate: z.string().max(50).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(50)
});

export const addPurgeConfirmSchema = z.object({
  confirmTicketId: z.string().min(1, 'confirmTicketId is required').max(100).trim()
});

export const purgeTicketConfirmSchema = addPurgeConfirmSchema;

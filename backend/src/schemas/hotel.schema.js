/**
 * AfricaTravel — Hotel Booking Request Validation Schemas
 */

import { z } from 'zod';

const validDateString = z.string().trim().min(1, 'Date is required').max(50)
  .refine(val => !isNaN(new Date(val).getTime()), {
    message: 'Invalid date format'
  });

export const generateHotelAiSchema = z.object({
  clientName: z.string().trim().min(1, 'Client name is required').max(200, 'Client name is too long'),
  country: z.string().trim().min(1, 'Country / City is required').max(100, 'Country is too long'),
  checkIn: validDateString,
  checkOut: validDateString,
  customerId: z.string().max(100).optional().nullable()
}).refine(data => {
  const inDate = new Date(data.checkIn);
  const outDate = new Date(data.checkOut);
  return outDate > inDate;
}, {
  message: 'Check-out date must be after check-in date',
  path: ['checkOut']
});

export const createHotelBookingSchema = z.object({
  clientName: z.string().trim().min(1, 'Client name is required').max(200),
  country: z.string().trim().min(1, 'Country is required').max(100),
  city: z.string().trim().min(1, 'City is required').max(100),
  hotelName: z.string().trim().min(1, 'Hotel name is required').max(200),
  hotelStars: z.coerce.number().int().min(1).max(5).default(5),
  hotelAddress: z.string().max(300).optional().nullable(),
  confirmationNumber: z.string().trim().min(1, 'Confirmation number is required').max(100),
  bookingReference: z.string().max(100).optional(),
  checkIn: validDateString,
  checkOut: validDateString,
  nights: z.coerce.number().int().min(1).default(1),
  roomType: z.string().max(100).default('Standard Double Room'),
  boardBasis: z.string().max(100).default('Bed & Breakfast'),
  guests: z.string().max(100).default('1 Guest'),
  specialRequests: z.string().max(1000).optional().nullable(),
  notes: z.string().max(1000).optional().nullable(),
  customerId: z.string().max(100).optional().nullable(),
  status: z.string().max(50).default('CONFIRMED')
});

export const queryHotelBookingsSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(25),
  search: z.string().optional(),
  country: z.string().optional(),
  status: z.string().optional()
});

/**
 * AfricaTravel — Hotel Bookings & AI Routes
 */

import { Router } from 'express';
import { HotelController } from '../controllers/hotel.controller.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import {
  generateHotelAiSchema,
  createHotelBookingSchema,
  queryHotelBookingsSchema
} from '../schemas/hotel.schema.js';

const router = Router();

// All hotel endpoints require authentication
router.use(authenticate);

// AI Generation endpoint
router.post('/ai-generate', requireRole('ADMIN', 'AGENT'), validate({ body: generateHotelAiSchema }), HotelController.generateAi);

// CRUD endpoints
router.get('/', requireRole('ADMIN', 'AGENT'), validate({ query: queryHotelBookingsSchema }), HotelController.getBookings);
router.post('/', requireRole('ADMIN', 'AGENT'), validate({ body: createHotelBookingSchema }), HotelController.createBooking);
router.get('/:id', requireRole('ADMIN', 'AGENT'), HotelController.getBookingById);
router.delete('/:id', requireRole('ADMIN', 'AGENT'), HotelController.deleteBooking);

export default router;

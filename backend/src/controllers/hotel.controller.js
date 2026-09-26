/**
 * AfricaTravel — Hotel Bookings & AI Controller
 */

import { HotelService } from '../services/hotel.service.js';

export const HotelController = {
  /**
   * POST /api/hotels/ai-generate
   * Generates realistic hotel reservation data using AI
   */
  async generateAi(req, res, next) {
    try {
      const result = await HotelService.generateAi(req.body);
      return res.status(200).json({
        success: true,
        data: result
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * POST /api/hotels
   * Saves a generated or manual hotel booking to the system
   */
  async createBooking(req, res, next) {
    try {
      const booking = await HotelService.createBooking(req.body, req.user);
      return res.status(201).json({
        success: true,
        data: booking
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * GET /api/hotels
   * Lists hotel bookings with search & pagination
   */
  async getBookings(req, res, next) {
    try {
      const result = await HotelService.listBookings(req.query);
      return res.status(200).json({
        success: true,
        data: result.items,
        pagination: result.pagination
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * GET /api/hotels/:id
   * Retrieves single hotel booking
   */
  async getBookingById(req, res, next) {
    try {
      const booking = await HotelService.getBookingById(req.params.id);
      return res.status(200).json({
        success: true,
        data: booking
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * DELETE /api/hotels/:id
   * Soft deletes a hotel booking
   */
  async deleteBooking(req, res, next) {
    try {
      const deleted = await HotelService.deleteBooking(req.params.id, req.user);
      return res.status(200).json({
        success: true,
        message: 'Hotel booking deleted successfully',
        data: { id: deleted.id }
      });
    } catch (err) {
      next(err);
    }
  }
};

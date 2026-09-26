/**
 * AfricaTravel — Hotel Service (API Client wrapper)
 */

import { apiClient } from './api-client.js';

export const HotelService = {
  /**
   * Generate realistic hotel booking details via AI
   */
  async generateAiBooking(data) {
    return await apiClient.post('/hotels/ai-generate', data);
  },

  /**
   * List saved hotel bookings
   */
  async getBookings(filters = {}) {
    return await apiClient.get('/hotels', filters);
  },

  /**
   * Get single booking by ID
   */
  async getBookingById(id) {
    return await apiClient.get(`/hotels/${id}`);
  },

  /**
   * Save hotel booking in database
   */
  async createBooking(data) {
    return await apiClient.post('/hotels', data);
  },

  /**
   * Delete hotel booking
   */
  async deleteBooking(id) {
    return await apiClient.delete(`/hotels/${id}`);
  }
};

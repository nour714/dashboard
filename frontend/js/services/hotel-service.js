/**
 * AfricaTravel — Hotel Service (API Client wrapper)
 */

import { apiClient } from './api-client.js';

export const HotelService = {
  /**
   * Generate realistic hotel booking details via AI
   */
  async generateAiBooking(data) {
    const res = await apiClient.post('/hotels/ai-generate', data);
    if (!res || !res.success) {
      throw new Error(res?.error?.message || 'Failed to generate hotel booking');
    }
    return res;
  },

  /**
   * List saved hotel bookings
   */
  async getBookings(filters = {}) {
    const res = await apiClient.get('/hotels', filters);
    if (!res || !res.success) {
      return { data: [], pagination: {} };
    }
    return res;
  },

  /**
   * Get single booking by ID
   */
  async getBookingById(id) {
    const res = await apiClient.get(`/hotels/${id}`);
    if (!res || !res.success) {
      throw new Error(res?.error?.message || 'Failed to fetch hotel booking');
    }
    return res;
  },

  /**
   * Save hotel booking in database
   */
  async createBooking(data) {
    const res = await apiClient.post('/hotels', data);
    if (!res || !res.success) {
      throw new Error(res?.error?.message || 'Failed to save hotel booking');
    }
    return res;
  },

  /**
   * Delete hotel booking
   */
  async deleteBooking(id) {
    const res = await apiClient.delete(`/hotels/${id}`);
    if (!res || !res.success) {
      throw new Error(res?.error?.message || 'Failed to delete hotel booking');
    }
    return res;
  }
};

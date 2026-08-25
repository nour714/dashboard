/**
 * AfricaTravel — Customer Service
 *
 * Reads are synchronous against the store's hydrated cache. Writes go
 * through the backend API via the store's async mutation methods.
 */

import { store } from '../state/store.js';
import { apiClient } from './api-client.js';
import { calculateTotalPaid, calculateRemaining, calculateTotalRefunded } from '../domain/ticket-rules.js';

export const CustomerService = {
  getAllCustomers(query = '') {
    const { customers } = store.getState();
    if (!query) return customers;
    const q = query.toLowerCase().trim();
    return customers.filter(c =>
      (c.name && c.name.toLowerCase().includes(q)) ||
      (c.email && c.email.toLowerCase().includes(q)) ||
      (c.phone && c.phone.toLowerCase().includes(q)) ||
      (c.passport && c.passport.toLowerCase().includes(q)) ||
      (c.id && c.id.toLowerCase().includes(q))
    );
  },

  getCustomers(query) {
    return this.getAllCustomers(query);
  },

  searchCustomers(query) {
    return this.getAllCustomers(query);
  },

  getCustomerById(customerId) {
    if (!customerId) return null;
    const { customers } = store.getState();
    return customers.find(c => c.id === customerId) || null;
  },

  getCustomer(customerId) {
    return this.getCustomerById(customerId);
  },

  getCustomerStats(customerId) {
    const { tickets } = store.getState();
    const customerTickets = tickets.filter(t => t.customerId === customerId);

    let totalSpent = 0;
    let totalPaid = 0;
    let totalRefunded = 0;
    let totalOutstanding = 0;

    customerTickets.forEach(t => {
      totalSpent += (Number(t.ticketPrice) || 0);
      const paid = calculateTotalPaid(t.payments);
      totalPaid += paid;
      totalRefunded += calculateTotalRefunded(t.refunds);
      totalOutstanding += calculateRemaining(t.ticketPrice, paid);
    });

    return {
      ticketCount: customerTickets.length,
      totalSpent,
      totalPaid,
      totalRefunded,
      totalOutstanding,
      tickets: customerTickets
    };
  },

  /**
   * @returns {Promise<{success: boolean, data?: object, error?: object}>}
   */
  async createCustomer(data) {
    try {
      return await store.createCustomer(data);
    } catch (err) {
      return {
        success: false,
        error: { message: err.message || 'Failed to create customer', code: err.code || 'CREATE_CUSTOMER_ERROR' }
      };
    }
  },

  /**
   * @returns {Promise<{success: boolean, data?: object, error?: object}>}
   */
  async updateCustomer(customerId, data) {
    try {
      return await store.updateCustomer(customerId, data);
    } catch (err) {
      return {
        success: false,
        error: { message: err.message || 'Failed to update customer', code: err.code || 'UPDATE_CUSTOMER_ERROR' }
      };
    }
  },

  /**
   * @returns {Promise<{success: boolean, data?: object, error?: object}>}
   */
  async addNote(customerId, text) {
    try {
      return await store.addCustomerNote(customerId, (text || '').trim());
    } catch (err) {
      return {
        success: false,
        error: { message: err.message || 'Failed to add customer note', code: err.code || 'ADD_NOTE_ERROR' }
      };
    }
  },

  /**
   * Upload a passport document for a customer
   * @param {string} customerId
   * @param {File} file
   * @returns {Promise<{success: boolean, data?: object, error?: object}>}
   */
  async uploadPassportDocument(customerId, file) {
    try {
      const formData = new FormData();
      formData.append('passportDocument', file);
      return await apiClient.post(`/customers/${customerId}/passport-document`, formData);
    } catch (err) {
      return {
        success: false,
        error: { message: err.message || 'Failed to upload passport document', code: 'UPLOAD_ERROR' }
      };
    }
  },

  /**
   * Get a signed URL for a customer's passport document
   * @param {string} customerId
   * @returns {Promise<{success: boolean, data?: {url: string, expiresAt: string}, error?: object}>}
   */
  async getPassportDocument(customerId) {
    try {
      return await apiClient.get(`/customers/${customerId}/passport-document`);
    } catch (err) {
      return {
        success: false,
        error: { message: err.message || 'Failed to get passport document', code: 'GET_DOC_ERROR' }
      };
    }
  },

  /**
   * Delete a customer's passport document (ADMIN only)
   * @param {string} customerId
   * @returns {Promise<{success: boolean, data?: object, error?: object}>}
   */
  async deletePassportDocument(customerId) {
    try {
      return await apiClient.delete(`/customers/${customerId}/passport-document`);
    } catch (err) {
      return {
        success: false,
        error: { message: err.message || 'Failed to delete passport document', code: 'DELETE_DOC_ERROR' }
      };
    }
  },

  /**
   * Soft-deletes a customer (ADMIN only).
   * @param {string} customerId
   * @returns {Promise<{success: boolean, data?: object, error?: object}>}
   */
  async deleteCustomer(customerId) {
    try {
      const res = await apiClient.delete(`/customers/${customerId}`);
      if (res.success) {
        const { customers } = store.getState();
        store.state.customers = customers.filter(c => c.id !== customerId);
        store.notify();
      }
      return res;
    } catch (err) {
      return {
        success: false,
        error: { message: err.message || 'Failed to delete customer', code: 'DELETE_CUSTOMER_ERROR' }
      };
    }
  },

  /**
   * Permanently purges a soft-deleted customer (ADMIN only).
   * @param {string} customerId
   * @param {string} confirmCustomerId
   * @returns {Promise<{success: boolean, data?: object, error?: object}>}
   */
  async purgeCustomer(customerId, confirmCustomerId) {
    try {
      const res = await apiClient.delete(`/customers/${customerId}/purge`, { body: { confirmCustomerId } });
      if (res.success) {
        const { customers } = store.getState();
        store.state.customers = customers.filter(c => c.id !== customerId);
        store.notify();
      }
      return res;
    } catch (err) {
      return {
        success: false,
        error: { message: err.message || 'Failed to purge customer', code: 'PURGE_CUSTOMER_ERROR' }
      };
    }
  }
};


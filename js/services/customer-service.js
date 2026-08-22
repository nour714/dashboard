/**
 * AfricaTravel — Customer Service
 *
 * Reads are synchronous against the store's hydrated cache. Writes go
 * through the backend API via the store's async mutation methods.
 */

import { store } from '../state/store.js';
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
  }
};

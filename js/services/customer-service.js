/**
 * AfricaTravel — Customer Service
 *
 * Provides customer CRM directory queries, lifetime stats, and customer management.
 */

import { store } from '../state/store.js';
import { calculateTotalPaid, calculateRemaining, calculateTotalRefunded } from '../domain/ticket-rules.js';
import { ValidationError, NotFoundError } from '../domain/errors.js';

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

  createCustomer(data) {
    try {
      if (!data.name || !data.name.trim()) {
        throw new ValidationError('Customer name is required', 'name');
      }
      const customer = store.applyCustomerCreation(data);
      return { success: true, data: customer };
    } catch (err) {
      return {
        success: false,
        error: {
          message: err.message || 'Failed to create customer',
          code: err.code || 'CREATE_CUSTOMER_ERROR'
        }
      };
    }
  },

  updateCustomer(customerId, data) {
    try {
      const customer = this.getCustomerById(customerId);
      if (!customer) throw new NotFoundError('Customer', customerId);
      const updated = store.updateCustomer(customerId, data);
      return { success: true, data: updated };
    } catch (err) {
      return {
        success: false,
        error: {
          message: err.message || 'Failed to update customer',
          code: err.code || 'UPDATE_CUSTOMER_ERROR'
        }
      };
    }
  },

  addNote(customerId, text) {
    try {
      if (!text || !text.trim()) {
        throw new ValidationError('Note text cannot be empty', 'text');
      }
      const note = store.addCustomerNote(customerId, text.trim());
      return { success: true, data: note };
    } catch (err) {
      return {
        success: false,
        error: {
          message: err.message || 'Failed to add customer note',
          code: err.code || 'ADD_NOTE_ERROR'
        }
      };
    }
  }
};

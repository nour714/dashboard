/**
 * AfricaTravel — Ticket, Payment, and Refund Service
 *
 * Provides a clean, domain-validated API interface for tickets, payments,
 * modifications, and refunds.
 */

import { store } from '../state/store.js';
import {
  calculateTotalPaid,
  calculateRemaining,
  calculateTotalModificationFees,
  calculateTotalRefunded,
  calculateAvailableRefund,
  calculateNetValue,
  derivePaymentStatus,
  validateTicketCreation
} from '../domain/ticket-rules.js';
import { validatePayment } from '../domain/payment-rules.js';
import { validateRefund } from '../domain/refund-rules.js';
import { validateModification } from '../domain/modification-rules.js';
import { NotFoundError } from '../domain/errors.js';

export const TicketService = {
  /**
   * Retrieves all tickets with optional filtering
   * @param {object} filters
   * @returns {Array<object>}
   */
  getAllTickets(filters = {}) {
    const { tickets } = store.getState();
    let result = [...tickets];

    if (filters.search) {
      const q = filters.search.toLowerCase().trim();
      result = result.filter(t =>
        (t.id && t.id.toLowerCase().includes(q)) ||
        (t.ticketNumber && t.ticketNumber.toLowerCase().includes(q)) ||
        (t.pnr && t.pnr.toLowerCase().includes(q)) ||
        (t.passengerName && t.passengerName.toLowerCase().includes(q)) ||
        (t.phone && t.phone.toLowerCase().includes(q)) ||
        (t.passport && t.passport.toLowerCase().includes(q)) ||
        (t.airline && t.airline.toLowerCase().includes(q)) ||
        (t.origin && t.origin.toLowerCase().includes(q)) ||
        (t.destination && t.destination.toLowerCase().includes(q))
      );
    }

    if (filters.status && filters.status !== 'All' && filters.status !== 'All Statuses') {
      result = result.filter(t => t.status === filters.status);
    }

    if (filters.airline && filters.airline !== 'All' && filters.airline !== 'All Airlines') {
      result = result.filter(t => t.airline === filters.airline || t.airlineCode === filters.airline);
    }

    if (filters.travelDate) {
      const searchDate = new Date(filters.travelDate).toISOString().slice(0, 10);
      result = result.filter(t => t.departureDate && t.departureDate.slice(0, 10) === searchDate);
    }

    return result;
  },

  getTickets(filters) {
    return this.getAllTickets(filters);
  },

  /**
   * Finds ticket by ID, ticketNumber, or PNR
   * @param {string} ticketId
   * @returns {object|null}
   */
  getTicketById(ticketId) {
    if (!ticketId) return null;
    const { tickets } = store.getState();
    return tickets.find(t => t.id === ticketId || t.ticketNumber === ticketId || t.pnr === ticketId) || null;
  },

  getTicket(ticketId) {
    return this.getTicketById(ticketId);
  },

  /**
   * Computes financial balance snapshot for a ticket
   * @param {object} ticket
   * @returns {object}
   */
  getTicketFinancials(ticket) {
    if (!ticket) return null;
    const totalPaid = calculateTotalPaid(ticket.payments);
    const remaining = calculateRemaining(ticket.ticketPrice, totalPaid);
    const modificationFees = calculateTotalModificationFees(ticket.modifications);
    const totalRefunded = calculateTotalRefunded(ticket.refunds);
    const availableRefund = calculateAvailableRefund(totalPaid, totalRefunded);
    const netValue = calculateNetValue(ticket.ticketPrice, modificationFees, totalRefunded);
    const paymentStatus = derivePaymentStatus(ticket.ticketPrice, totalPaid, ticket.status);

    return {
      ticketPrice: ticket.ticketPrice,
      totalPaid,
      remaining,
      modificationFees,
      totalRefunded,
      availableRefund,
      netValue,
      paymentStatus,
      currency: ticket.currency || 'EGP'
    };
  },

  /**
   * Issues a new ticket after validating domain rules
   * @param {object} data
   * @returns {{success: boolean, data?: object, error?: object}}
   */
  createTicket(data) {
    try {
      validateTicketCreation(data);
      const newTicket = store.applyTicketCreation(data);
      return { success: true, data: newTicket };
    } catch (err) {
      return {
        success: false,
        error: {
          message: err.message || 'Failed to create ticket',
          code: err.code || 'CREATE_TICKET_ERROR',
          field: err.field || null
        }
      };
    }
  },

  /**
   * Updates non-financial details of a ticket
   * @param {string} ticketId
   * @param {object} updates
   * @returns {{success: boolean, data?: object, error?: object}}
   */
  updateTicket(ticketId, updates) {
    try {
      const ticket = this.getTicketById(ticketId);
      if (!ticket) throw new NotFoundError('Ticket', ticketId);
      const updated = store.updateTicket(ticket.id, updates);
      return { success: true, data: updated };
    } catch (err) {
      return {
        success: false,
        error: {
          message: err.message || 'Failed to update ticket',
          code: err.code || 'UPDATE_TICKET_ERROR'
        }
      };
    }
  },

  /**
   * Records a payment against a ticket
   * @param {string} ticketId
   * @param {object} paymentData
   * @returns {{success: boolean, data?: object, error?: object}}
   */
  addPayment(ticketId, paymentData) {
    try {
      const ticket = this.getTicketById(ticketId);
      if (!ticket) throw new NotFoundError('Ticket', ticketId);

      validatePayment(ticket, paymentData);
      const payment = store.applyPayment(ticket.id, paymentData);
      return { success: true, data: payment };
    } catch (err) {
      return {
        success: false,
        error: {
          message: err.message || 'Failed to record payment',
          code: err.code || 'PAYMENT_ERROR',
          field: err.field || null
        }
      };
    }
  },

  /**
   * Applies flight schedule modification
   * @param {string} ticketId
   * @param {object} modData
   * @returns {{success: boolean, data?: object, error?: object}}
   */
  addModification(ticketId, modData) {
    try {
      const ticket = this.getTicketById(ticketId);
      if (!ticket) throw new NotFoundError('Ticket', ticketId);

      validateModification(ticket, modData);
      const mod = store.applyModification(ticket.id, modData);
      return { success: true, data: mod };
    } catch (err) {
      return {
        success: false,
        error: {
          message: err.message || 'Failed to apply modification',
          code: err.code || 'MODIFICATION_ERROR',
          field: err.field || null
        }
      };
    }
  },

  /**
   * Processes a refund against a ticket
   * @param {string} ticketId
   * @param {object} refundData
   * @returns {{success: boolean, data?: object, error?: object}}
   */
  addRefund(ticketId, refundData) {
    try {
      const ticket = this.getTicketById(ticketId);
      if (!ticket) throw new NotFoundError('Ticket', ticketId);

      validateRefund(ticket, refundData);
      const refund = store.applyRefund(ticket.id, refundData);
      return { success: true, data: refund };
    } catch (err) {
      return {
        success: false,
        error: {
          message: err.message || 'Failed to process refund',
          code: err.code || 'REFUND_ERROR',
          field: err.field || null
        }
      };
    }
  }
};

// Aliased service interfaces for future backend endpoint separation
export const PaymentService = {
  addPayment(ticketId, paymentData) {
    return TicketService.addPayment(ticketId, paymentData);
  }
};

export const RefundService = {
  createRefund(ticketId, refundData) {
    return TicketService.addRefund(ticketId, refundData);
  }
};

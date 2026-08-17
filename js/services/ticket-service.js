/**
 * AfriciaTravel — Ticket Service
 *
 * Provides domain-validated API interface for tickets, payments, modifications, and refunds.
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
import { NotFoundError, AppError } from '../domain/errors.js';

export const TicketService = {
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

  getTicketById(ticketId) {
    if (!ticketId) return null;
    const { tickets } = store.getState();
    return tickets.find(t => t.id === ticketId || t.ticketNumber === ticketId || t.pnr === ticketId) || null;
  },

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

  createTicket(data) {
    try {
      validateTicketCreation(data);
      const newTicket = store.createTicket(data);
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

  addPayment(ticketId, paymentData) {
    try {
      const ticket = this.getTicketById(ticketId);
      if (!ticket) throw new NotFoundError('Ticket', ticketId);

      validatePayment(ticket, paymentData);
      const payment = store.addPayment(ticket.id, paymentData);
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

  addModification(ticketId, modData) {
    try {
      const ticket = this.getTicketById(ticketId);
      if (!ticket) throw new NotFoundError('Ticket', ticketId);

      validateModification(ticket, modData);
      const mod = store.addModification(ticket.id, modData);
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

  addRefund(ticketId, refundData) {
    try {
      const ticket = this.getTicketById(ticketId);
      if (!ticket) throw new NotFoundError('Ticket', ticketId);

      validateRefund(ticket, refundData);
      const refund = store.addRefund(ticket.id, refundData);
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

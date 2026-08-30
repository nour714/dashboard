/**
 * AfricaTravel — Ticket, Payment, and Refund Service
 *
 * Reads are synchronous against the store's hydrated in-memory cache. Writes
 * (create/update/payment/modification/refund) are async: they call the
 * backend API — which enforces domain validation server-side — and only
 * patch the local cache once the server confirms the write.
 */

import { store } from '../state/store.js';
import { apiClient } from './api-client.js';
import {
  calculateTotalPaid,
  calculateRemaining,
  calculateTotalModificationFees,
  calculateTotalRefunded,
  calculateAvailableRefund,
  calculateNetValue,
  calculateNetProfit,
  derivePaymentStatus
} from '../domain/ticket-rules.js';

export const TicketService = {
  /**
   * Retrieves all cached tickets with optional client-side filtering.
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
   * Finds a cached ticket by ID, ticketNumber, or PNR.
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
   * Computes financial balance snapshot for a ticket (mirrors backend logic).
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
    const costPrice = ticket.costPrice !== null && ticket.costPrice !== undefined ? Number(ticket.costPrice) : null;
    const netProfit = calculateNetProfit(ticket.ticketPrice, costPrice);

    return {
      ticketPrice: ticket.ticketPrice,
      costPrice,
      netProfit,
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
   * Issues a new ticket. Domain validation is enforced by the backend.
   * @param {object} data
   * @returns {Promise<{success: boolean, data?: object, error?: object}>}
   */
  async createTicket(data) {
    try {
      return await store.createTicket(data);
    } catch (err) {
      return {
        success: false,
        error: { message: err.message || 'Failed to create ticket', code: err.code || 'CREATE_TICKET_ERROR' }
      };
    }
  },

  /**
   * Updates non-financial details of a ticket.
   * @param {string} ticketId
   * @param {object} updates
   * @returns {Promise<{success: boolean, data?: object, error?: object}>}
   */
  async updateTicket(ticketId, updates) {
    try {
      return await store.updateTicket(ticketId, updates);
    } catch (err) {
      return {
        success: false,
        error: { message: err.message || 'Failed to update ticket', code: err.code || 'UPDATE_TICKET_ERROR' }
      };
    }
  },

  /**
   * Records a payment against a ticket. Backend enforces the remaining-balance rule.
   * @param {string} ticketId
   * @param {object} paymentData
   * @returns {Promise<{success: boolean, data?: object, error?: object}>}
   */
  async addPayment(ticketId, paymentData) {
    try {
      return await store.addPayment(ticketId, paymentData);
    } catch (err) {
      return {
        success: false,
        error: { message: err.message || 'Failed to record payment', code: err.code || 'PAYMENT_ERROR' }
      };
    }
  },

  /**
   * Applies a flight schedule modification. Backend enforces schedule-chronology rules.
   * @param {string} ticketId
   * @param {object} modData
   * @returns {Promise<{success: boolean, data?: object, error?: object}>}
   */
  async addModification(ticketId, modData) {
    try {
      return await store.addModification(ticketId, modData);
    } catch (err) {
      return {
        success: false,
        error: { message: err.message || 'Failed to apply modification', code: err.code || 'MODIFICATION_ERROR' }
      };
    }
  },

  /**
   * Processes a refund against a ticket. Backend enforces the available-refund rule.
   * @param {string} ticketId
   * @param {object} refundData
   * @returns {Promise<{success: boolean, data?: object, error?: object}>}
   */
  async addRefund(ticketId, refundData) {
    try {
      return await store.addRefund(ticketId, refundData);
    } catch (err) {
      return {
        success: false,
        error: { message: err.message || 'Failed to process refund', code: err.code || 'REFUND_ERROR' }
      };
    }
  },

  /**
   * Soft-deletes a ticket (ADMIN only).
   * @param {string} ticketId
   * @returns {Promise<{success: boolean, data?: object, error?: object}>}
   */
  async deleteTicket(ticketId) {
    try {
      const res = await apiClient.delete(`/tickets/${ticketId}`);
      if (res.success) {
        await store.refreshTickets().catch(() => {});
      }
      return res;
    } catch (err) {
      return {
        success: false,
        error: { message: err.message || 'Failed to delete ticket', code: 'DELETE_TICKET_ERROR' }
      };
    }
  },

  /**
   * Permanently purges a soft-deleted ticket (ADMIN only).
   * @param {string} ticketId
   * @param {string} confirmTicketId
   * @returns {Promise<{success: boolean, data?: object, error?: object}>}
   */
  async purgeTicket(ticketId, confirmTicketId) {
    try {
      const res = await apiClient.delete(`/tickets/${ticketId}/purge`, { body: { confirmTicketId } });
      if (res.success) {
        await store.refreshTickets().catch(() => {});
      }
      return res;
    } catch (err) {
      return {
        success: false,
        error: { message: err.message || 'Failed to purge ticket', code: 'PURGE_TICKET_ERROR' }
      };
    }
  },

  /**
   * Extracts ticket booking fields from an uploaded document using Gemini AI.
   * @param {File|Blob} file
   * @returns {Promise<{success: boolean, data?: object, error?: object}>}
   */
  async extractFromDocument(file) {
    try {
      const formData = new FormData();
      formData.append('document', file);
      return await apiClient.post('/tickets/extract-from-document', formData);
    } catch (err) {
      return {
        success: false,
        error: { message: err.message || 'Extraction failed', code: 'EXTRACTION_ERROR' }
      };
    }
  }
};

// Aliased service interfaces retained for call-site compatibility
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

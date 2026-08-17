/**
 * AfricaTravel — Ticket Domain Business Rules & Calculations
 *
 * Centralized source of truth for ticket accounting, balances, and status transitions.
 */

import { ValidationError, BusinessRuleError } from './errors.js';

/**
 * Calculates total sum of recorded payments
 * @param {Array<{amount: number}>} payments
 * @returns {number}
 */
export function calculateTotalPaid(payments = []) {
  if (!Array.isArray(payments)) return 0;
  return payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
}

/**
 * Calculates remaining balance
 * remaining = max(0, ticketPrice - totalPaid)
 * @param {number} ticketPrice
 * @param {number} totalPaid
 * @returns {number}
 */
export function calculateRemaining(ticketPrice = 0, totalPaid = 0) {
  const price = Number(ticketPrice) || 0;
  const paid = Number(totalPaid) || 0;
  const rem = price - paid;
  return rem > 0 ? rem : 0;
}

/**
 * Calculates total modification fees
 * @param {Array<{changeFee: number}>} modifications
 * @returns {number}
 */
export function calculateTotalModificationFees(modifications = []) {
  if (!Array.isArray(modifications)) return 0;
  return modifications.reduce((sum, m) => sum + (Number(m.changeFee) || 0), 0);
}

/**
 * Calculates total completed refunds
 * @param {Array<{amount: number, status: string}>} refunds
 * @returns {number}
 */
export function calculateTotalRefunded(refunds = []) {
  if (!Array.isArray(refunds)) return 0;
  return refunds
    .filter(r => r.status === 'COMPLETED' || r.status === 'Refunded' || r.status === 'APPROVED')
    .reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
}

/**
 * Calculates available refundable balance
 * availableRefund = max(0, totalPaid - totalRefunded)
 * @param {number} totalPaid
 * @param {number} totalRefunded
 * @returns {number}
 */
export function calculateAvailableRefund(totalPaid = 0, totalRefunded = 0) {
  const paid = Number(totalPaid) || 0;
  const refunded = Number(totalRefunded) || 0;
  const avail = paid - refunded;
  return avail > 0 ? avail : 0;
}

/**
 * Calculates Net Ticket Value
 * netValue = max(0, ticketPrice + totalModificationFees - totalRefunded)
 * @param {number} ticketPrice
 * @param {number} modificationFees
 * @param {number} totalRefunded
 * @returns {number}
 */
export function calculateNetValue(ticketPrice = 0, modificationFees = 0, totalRefunded = 0) {
  const price = Number(ticketPrice) || 0;
  const modFees = Number(modificationFees) || 0;
  const ref = Number(totalRefunded) || 0;
  return Math.max(0, price + modFees - ref);
}

/**
 * Derives payment status from financial ledger
 * @param {number} ticketPrice
 * @param {number} totalPaid
 * @param {string} currentStatus
 * @returns {string} 'PAID' | 'PARTIALLY PAID' | 'CONFIRMED' | 'CANCELLED' | 'REFUNDED'
 */
export function derivePaymentStatus(ticketPrice = 0, totalPaid = 0, currentStatus = 'CONFIRMED') {
  if (currentStatus === 'CANCELLED') return 'CANCELLED';
  if (currentStatus === 'REFUNDED') return 'REFUNDED';
  const price = Number(ticketPrice) || 0;
  const paid = Number(totalPaid) || 0;
  if (paid >= price && price > 0) return 'PAID';
  if (paid > 0 && paid < price) return 'PARTIALLY PAID';
  return 'CONFIRMED';
}

/**
 * Validates ticket creation parameters
 * @param {object} data
 */
export function validateTicketCreation(data = {}) {
  if (!data.passengerName || !data.passengerName.trim()) {
    throw new ValidationError('Passenger name is required', 'passengerName');
  }
  if (!data.origin || !data.origin.trim()) {
    throw new ValidationError('Flight origin is required', 'origin');
  }
  if (!data.destination || !data.destination.trim()) {
    throw new ValidationError('Flight destination is required', 'destination');
  }
  const price = Number(data.ticketPrice);
  if (isNaN(price) || price <= 0) {
    throw new ValidationError('Ticket price must be greater than zero', 'ticketPrice');
  }
  if (data.initialPayment !== undefined && data.initialPayment !== null && data.initialPayment !== '') {
    const initPay = Number(data.initialPayment);
    if (isNaN(initPay) || initPay < 0) {
      throw new ValidationError('Initial payment cannot be negative', 'initialPayment');
    }
    if (initPay > price) {
      throw new BusinessRuleError(`Initial payment (${initPay}) cannot exceed ticket price (${price})`, 'MAX_INITIAL_PAYMENT');
    }
  }
  return true;
}

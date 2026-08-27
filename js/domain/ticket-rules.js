/**
 * AfricaTravel - Ticket Domain Business Rules & Calculations
 *
 * Centralized source of truth for ticket accounting, balances, and status transitions.
 */

import { ValidationError, BusinessRuleError } from './errors.js';

/**
 * Calculates total sum of recorded payments
 * @param {Array<{amount: number|string}>} payments
 * @returns {number}
 */
export function calculateTotalPaid(payments = []) {
  if (!Array.isArray(payments)) return 0;
  return payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
}

/**
 * Calculates remaining balance
 * remaining = max(0, ticketPrice - totalPaid)
 * @param {number|string} ticketPrice
 * @param {number|string} totalPaid
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
 * @param {Array<{changeFee: number|string}>} modifications
 * @returns {number}
 */
export function calculateTotalModificationFees(modifications = []) {
  if (!Array.isArray(modifications)) return 0;
  return modifications.reduce((sum, m) => sum + (Number(m.changeFee) || 0), 0);
}

/**
 * Calculates total completed refunds
 * @param {Array<{amount: number|string, status: string}>} refunds
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
 * @param {number|string} totalPaid
 * @param {number|string} totalRefunded
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
 * @param {number|string} ticketPrice
 * @param {number|string} modificationFees
 * @param {number|string} totalRefunded
 * @returns {number}
 */
export function calculateNetValue(ticketPrice = 0, modificationFees = 0, totalRefunded = 0) {
  const price = Number(ticketPrice) || 0;
  const modFees = Number(modificationFees) || 0;
  const ref = Number(totalRefunded) || 0;
  return Math.max(0, price + modFees - ref);
}

/**
 * Calculates net profit for a ticket: selling price minus airline cost price.
 * Returns null if costPrice hasn't been recorded (legacy tickets).
 * @param {number|string} ticketPrice
 * @param {number|string|null} costPrice
 * @returns {number|null}
 */
export function calculateNetProfit(ticketPrice = 0, costPrice = null) {
  if (costPrice === null || costPrice === undefined) return null;
  return Number(ticketPrice) - Number(costPrice);
}

/**
 * Derives payment status from financial ledger
 * @param {number|string} ticketPrice
 * @param {number|string} totalPaid
 * @param {string} currentStatus
 * @returns {string} 'CONFIRMED' | 'PARTIALLY PAID' | 'UNPAID' | 'CANCELLED' | 'REFUNDED' | 'PARTIALLY_REFUNDED'
 */
export function derivePaymentStatus(ticketPrice = 0, totalPaid = 0, currentStatus = 'UNPAID') {
  if (currentStatus === 'CANCELLED') return 'CANCELLED';
  if (currentStatus === 'REFUNDED') return 'REFUNDED';
  if (currentStatus === 'PARTIALLY_REFUNDED') return 'PARTIALLY_REFUNDED';
  const price = Number(ticketPrice) || 0;
  const paid = Number(totalPaid) || 0;
  if (paid >= price && price > 0) return 'CONFIRMED';
  if (paid > 0 && paid < price) return 'PARTIALLY PAID';
  return 'UNPAID';
}

/**
 * Validates ticket creation parameters
 * @param {object} data
 * @returns {boolean}
 */
export function validateTicketCreation(data = {}) {
  if (!data.passengerName || !String(data.passengerName).trim()) {
    throw new ValidationError('Passenger name is required', 'passengerName');
  }
  if (!data.origin || !String(data.origin).trim()) {
    throw new ValidationError('Flight origin is required', 'origin');
  }
  if (!data.destination || !String(data.destination).trim()) {
    throw new ValidationError('Flight destination is required', 'destination');
  }
  const price = Number(data.ticketPrice);
  if (isNaN(price) || price <= 0) {
    throw new ValidationError('Ticket price must be greater than zero', 'ticketPrice');
  }
  if (data.costPrice !== undefined && data.costPrice !== null && data.costPrice !== '') {
    const cost = Number(data.costPrice);
    if (isNaN(cost) || cost <= 0) {
      throw new ValidationError('Cost price must be greater than zero', 'costPrice');
    }
  }
  if (data.initialPayment !== undefined && data.initialPayment !== null && data.initialPayment !== '') {
    const initPay = Number(data.initialPayment);
    if (isNaN(initPay) || initPay < 0) {
      throw new ValidationError('Initial payment cannot be negative', 'initialPayment');
    }
    if (initPay > price) {
      throw new BusinessRuleError(
        `Initial payment (${initPay}) cannot exceed ticket price (${price})`,
        'MAX_INITIAL_PAYMENT',
        { initialPayment: initPay, ticketPrice: price }
      );
    }
  }
  return true;
}

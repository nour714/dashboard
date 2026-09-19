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
 * @param {number|string} [_modificationFees] - Deprecated/ignored: modification fees are tracked independently
 * @returns {number}
 */
export function calculateRemaining(ticketPrice = 0, totalPaid = 0, _modificationFees = 0) {
  const price = Number(ticketPrice) || 0;
  const paid = Number(totalPaid) || 0;
  const rem = price - paid;
  return rem > 0 ? Math.round(rem * 100) / 100 : 0;
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
 * Calculates total profit margin from flight modifications
 * (sum of customer-charged fee minus airline cost fee, per modification)
 * @param {Array<{changeFee: number|string, airlineFee: number|string}>} modifications
 * @returns {number}
 */
export function calculateTotalModificationProfit(modifications = []) {
  if (!Array.isArray(modifications)) return 0;
  return modifications.reduce(
    (sum, m) => sum + ((Number(m.changeFee) || 0) - (Number(m.airlineFee) || 0)),
    0
  );
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
 * Calculates total airline refund received across completed refunds
 * @param {Array<{airlineRefundAmount: number|string, status: string}>} refunds
 * @returns {number}
 */
export function calculateTotalAirlineRefunded(refunds = []) {
  if (!Array.isArray(refunds)) return 0;
  return refunds
    .filter(r => r.status === 'COMPLETED' || r.status === 'Refunded' || r.status === 'APPROVED')
    .reduce((sum, r) => sum + (Number(r.airlineRefundAmount) || 0), 0);
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
 * netValue = max(0, ticketPrice - totalRefunded)
 * @param {number|string} ticketPrice
 * @param {number|string} [_modificationFees] - Deprecated/ignored: modification fees are tracked independently
 * @param {number|string} totalRefunded
 * @returns {number}
 */
export function calculateNetValue(ticketPrice = 0, _modificationFees = 0, totalRefunded = 0) {
  const price = Number(ticketPrice) || 0;
  const ref = Number(totalRefunded) || 0;
  return Math.max(0, price - ref);
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
 * Calculates retained net profit for a refunded ticket:
 * (retained amount from customer) minus (net unrefunded airline cost / cancellation penalty)
 * @param {number|string} totalPaid
 * @param {number|string} totalCustomerRefunded
 * @param {number|string|null} costPrice
 * @param {number|string} totalAirlineRefunded
 * @returns {number|null}
 */
export function calculateRefundedNetProfit(totalPaid = 0, totalCustomerRefunded = 0, costPrice = null, totalAirlineRefunded = 0) {
  const paid = Number(totalPaid) || 0;
  const custRef = Number(totalCustomerRefunded) || 0;
  const retainedCustomer = Math.max(0, paid - custRef);
  if (costPrice === null || costPrice === undefined) {
    return retainedCustomer;
  }
  const cost = Number(costPrice) || 0;
  const airRef = Number(totalAirlineRefunded) || 0;
  const netAirlineCost = Math.max(0, cost - airRef);
  return retainedCustomer - netAirlineCost;
}

/**
 * Derives payment status from financial ledger
 * @param {number|string} ticketPrice
 * @param {number|string} totalPaid
 * @param {string} currentStatus
 * @param {number|string} [_modificationFees] - Deprecated/ignored: modification fees are tracked independently
 * @returns {string} 'CONFIRMED' | 'PARTIALLY PAID' | 'UNPAID' | 'CANCELLED' | 'REFUNDED' | 'PARTIALLY_REFUNDED'
 */
export function derivePaymentStatus(ticketPrice = 0, totalPaid = 0, currentStatus = 'UNPAID', _modificationFees = 0) {
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
  const price = data.ticketPrice !== undefined && data.ticketPrice !== null && data.ticketPrice !== ''
    ? Number(data.ticketPrice)
    : 0;
  if (isNaN(price) || price < 0) {
    throw new ValidationError('Ticket price cannot be negative', 'ticketPrice');
  }
  if (data.costPrice !== undefined && data.costPrice !== null && data.costPrice !== '') {
    const cost = Number(data.costPrice);
    if (isNaN(cost) || cost < 0) {
      throw new ValidationError('Cost price cannot be negative', 'costPrice');
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

/**
 * AfricaTravel - Ticket Domain Business Rules & Calculations
 *
 * Centralized source of truth for ticket accounting, balances, and status transitions.
 */

import { ValidationError, BusinessRuleError } from './errors.js';

/**
 * Determines whether a payment was recorded specifically for a flight modification fee.
 * Strictly checks type === 'MODIFICATION'.
 * @param {object} p
 * @returns {boolean}
 */
export function isModificationPayment(p = {}) {
  return p?.type === 'MODIFICATION';
}

function toCents(v) {
  if (v === null || v === undefined || v === '') return 0;
  const num = Number(v);
  if (isNaN(num)) return 0;
  return Math.round(num * 100);
}

function fromCents(c) {
  return c / 100;
}

/**
 * Calculates total sum of recorded payments for the ticket.
 * Excludes modification fee payments unless includeModifications is explicitly true.
 * @param {Array<{amount: number|string}>} payments
 * @param {boolean} [includeModifications=false]
 * @returns {number}
 */
export function calculateTotalPaid(payments = [], includeModifications = false) {
  if (!Array.isArray(payments)) return 0;
  const cents = payments
    .filter(p => includeModifications || !isModificationPayment(p))
    .reduce((sum, p) => sum + toCents(p.amount), 0);
  return fromCents(cents);
}

/**
 * Calculates sum of modification fee payments.
 * @param {Array<{amount: number|string}>} payments
 * @returns {number}
 */
export function calculateModificationPaid(payments = []) {
  if (!Array.isArray(payments)) return 0;
  const cents = payments
    .filter(p => isModificationPayment(p))
    .reduce((sum, p) => sum + toCents(p.amount), 0);
  return fromCents(cents);
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
  const remCents = Math.max(0, toCents(ticketPrice) - toCents(totalPaid));
  return fromCents(remCents);
}

/**
 * Calculates total modification fees
 * @param {Array<{changeFee: number|string}>} modifications
 * @returns {number}
 */
export function calculateTotalModificationFees(modifications = []) {
  if (!Array.isArray(modifications)) return 0;
  const cents = modifications.reduce((sum, m) => sum + toCents(m.changeFee), 0);
  return fromCents(cents);
}

/**
 * Calculates total profit margin from flight modifications
 * (sum of customer-charged fee minus airline cost fee, per modification)
 * @param {Array<{changeFee: number|string, airlineFee: number|string}>} modifications
 * @returns {number}
 */
export function calculateTotalModificationProfit(modifications = []) {
  if (!Array.isArray(modifications)) return 0;
  const cents = modifications.reduce(
    (sum, m) => sum + (toCents(m.changeFee) - toCents(m.airlineFee)),
    0
  );
  return fromCents(cents);
}

/**
 * Calculates total completed refunds
 * @param {Array<{amount: number|string, status: string}>} refunds
 * @returns {number}
 */
export function calculateTotalRefunded(refunds = []) {
  if (!Array.isArray(refunds)) return 0;
  const cents = refunds
    .filter(r => {
      const st = (r.status || '').toUpperCase();
      return st === 'COMPLETED' || st === 'REFUNDED' || st === 'APPROVED';
    })
    .reduce((sum, r) => sum + toCents(r.amount), 0);
  return fromCents(cents);
}

/**
 * Calculates total airline refund received across completed refunds
 * @param {Array<{airlineRefundAmount: number|string, status: string}>} refunds
 * @returns {number}
 */
export function calculateTotalAirlineRefunded(refunds = []) {
  if (!Array.isArray(refunds)) return 0;
  const cents = refunds
    .filter(r => {
      const st = (r.status || '').toUpperCase();
      return st === 'COMPLETED' || st === 'REFUNDED' || st === 'APPROVED';
    })
    .reduce((sum, r) => sum + toCents(r.airlineRefundAmount), 0);
  return fromCents(cents);
}

/**
 * Calculates available refundable balance
 * availableRefund = max(0, totalPaid - totalRefunded - pendingRefunds)
 * @param {number|string} totalPaid
 * @param {number|string} totalRefunded
 * @param {number|string} [pendingRefunds=0]
 * @returns {number}
 */
export function calculateAvailableRefund(totalPaid = 0, totalRefunded = 0, pendingRefunds = 0) {
  const availCents = Math.max(0, toCents(totalPaid) - toCents(totalRefunded) - toCents(pendingRefunds));
  return fromCents(availCents);
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
  const netCents = Math.max(0, toCents(ticketPrice) - toCents(totalRefunded));
  return fromCents(netCents);
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
  const diffCents = toCents(ticketPrice) - toCents(costPrice);
  return fromCents(diffCents);
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
  const retainedCents = Math.max(0, toCents(totalPaid) - toCents(totalCustomerRefunded));
  if (costPrice === null || costPrice === undefined) {
    return fromCents(retainedCents);
  }
  const netAirlineCostCents = Math.max(0, toCents(costPrice) - toCents(totalAirlineRefunded));
  return fromCents(retainedCents - netAirlineCostCents);
}

/**
 * Derives payment status from financial ledger
 * @param {number|string} ticketPrice
 * @param {number|string} totalPaid
 * @param {string} currentStatus
 * @param {number|string} [_modificationFees] - Deprecated/ignored: modification fees are tracked independently
 * @returns {string} 'CONFIRMED' | 'PARTIALLY PAID' | 'UNPAID' | 'CANCELLED' | 'REFUNDED' | 'PARTIALLY_REFUNDED' | 'REFUND REQUESTED'
 */
export function derivePaymentStatus(ticketPrice = 0, totalPaid = 0, currentStatus = 'UNPAID', _modificationFees = 0) {
  const normStatus = (currentStatus || '').toUpperCase();
  if (normStatus === 'CANCELLED') return 'CANCELLED';
  if (normStatus === 'REFUNDED') return 'REFUNDED';
  if (normStatus === 'PARTIALLY_REFUNDED') return 'PARTIALLY_REFUNDED';
  if (normStatus === 'REFUND REQUESTED') return 'REFUND REQUESTED';

  const price = Number(ticketPrice) || 0;
  const paid = Number(totalPaid) || 0;

  if (price > 0 && paid >= price) return 'CONFIRMED';
  if (price <= 0 && paid > 0) return 'CONFIRMED';
  if (paid > 0 && paid < price) return 'PARTIALLY PAID';
  return 'UNPAID';
}

/**
 * Unified ticket status derivation based on DB record state and financial ledger.
 * Single source of truth called after payment, refund, price edit, and modification.
 *
 * @param {object} ticket
 * @returns {string}
 */
export function deriveTicketStatus(ticket = {}) {
  const currentStatus = (ticket.status || 'UNPAID').toUpperCase();
  if (currentStatus === 'CANCELLED') return 'CANCELLED';

  const refunds = Array.isArray(ticket.refunds) ? ticket.refunds : [];

  const completedRefunds = refunds.filter(r => {
    const st = (r.status || '').toUpperCase();
    return st === 'COMPLETED' || st === 'APPROVED' || st === 'REFUNDED';
  });

  const pendingRefunds = refunds.filter(r => {
    const st = (r.status || '').toUpperCase();
    return st === 'PENDING' || st === 'REQUESTED';
  });

  if (completedRefunds.length > 0) {
    const totalPaid = calculateTotalPaid(ticket.payments || []);
    const totalRefunded = completedRefunds.reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
    const isCompletedCancellation = completedRefunds.some(r => r.isCompletedCancellation === true);

    if (isCompletedCancellation || (totalPaid > 0 && totalRefunded >= totalPaid)) {
      return 'REFUNDED';
    }
    return 'PARTIALLY_REFUNDED';
  }

  if (pendingRefunds.length > 0) {
    return 'REFUND REQUESTED';
  }

  if (currentStatus === 'MODIFIED') {
    return 'MODIFIED';
  }

  const totalPaid = calculateTotalPaid(ticket.payments || []);
  return derivePaymentStatus(ticket.ticketPrice, totalPaid, currentStatus);
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

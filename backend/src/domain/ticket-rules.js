/**
 * AfricaTravel - Ticket Domain Business Rules & Calculations
 *
 * Centralized source of truth for ticket accounting, balances, and status transitions.
 */

import { ValidationError, BusinessRuleError } from './errors.js';
import Decimal from 'decimal.js';
import { asDecimal, moneyNumber } from '../utils/money.js';

/**
 * Determines whether a payment was recorded specifically for a flight modification fee.
 * Strictly checks type === 'MODIFICATION'.
 * @param {object} p
 * @returns {boolean}
 */
export function isModificationPayment(p = {}) {
  return p?.type === 'MODIFICATION';
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
  return moneyNumber(
    payments
      .filter(p => includeModifications || !isModificationPayment(p))
      .reduce((sum, p) => sum.plus(asDecimal(p.amount)), asDecimal(0))
  );
}

/**
 * Calculates sum of modification fee payments.
 * @param {Array<{amount: number|string}>} payments
 * @returns {number}
 */
export function calculateModificationPaid(payments = []) {
  if (!Array.isArray(payments)) return 0;
  return moneyNumber(
    payments
      .filter(p => isModificationPayment(p))
      .reduce((sum, p) => sum.plus(asDecimal(p.amount)), asDecimal(0))
  );
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
  return moneyNumber(Decimal.max(0, asDecimal(ticketPrice).minus(asDecimal(totalPaid))));
}

/**
 * Calculates total modification fees
 * @param {Array<{changeFee: number|string}>} modifications
 * @returns {number}
 */
export function calculateTotalModificationFees(modifications = []) {
  if (!Array.isArray(modifications)) return 0;
  return moneyNumber(modifications.reduce((sum, m) => sum.plus(asDecimal(m.changeFee)), asDecimal(0)));
}

/**
 * Calculates total profit margin from flight modifications
 * (sum of customer-charged fee minus airline cost fee, per modification)
 * @param {Array<{changeFee: number|string, airlineFee: number|string}>} modifications
 * @returns {number}
 */
export function calculateTotalModificationProfit(modifications = []) {
  if (!Array.isArray(modifications)) return 0;
  return moneyNumber(
    modifications.reduce(
      (sum, m) => sum.plus(asDecimal(m.changeFee).minus(asDecimal(m.airlineFee || 0))),
      asDecimal(0)
    )
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
    .filter(r => {
      const st = (r.status || '').toUpperCase();
      return st === 'COMPLETED' || st === 'REFUNDED' || st === 'APPROVED';
    })
    .reduce((sum, r) => sum.plus(asDecimal(r.amount)), asDecimal(0)).toDecimalPlaces(2).toNumber();
}

/**
 * Calculates total airline refund received across completed refunds
 * @param {Array<{airlineRefundAmount: number|string, status: string}>} refunds
 * @returns {number}
 */
export function calculateTotalAirlineRefunded(refunds = []) {
  if (!Array.isArray(refunds)) return 0;
  return refunds
    .filter(r => {
      const st = (r.status || '').toUpperCase();
      return st === 'COMPLETED' || st === 'REFUNDED' || st === 'APPROVED';
    })
    .reduce((sum, r) => sum.plus(asDecimal(r.airlineRefundAmount || 0)), asDecimal(0)).toDecimalPlaces(2).toNumber();
}

/**
 * Calculates available refundable balance
 * availableRefund = max(0, totalPaid - totalRefunded)
 * @param {number|string} totalPaid
 * @param {number|string} totalRefunded
 * @returns {number}
 */
export function calculateAvailableRefund(totalPaid = 0, totalRefunded = 0) {
  return moneyNumber(Decimal.max(0, asDecimal(totalPaid).minus(asDecimal(totalRefunded))));
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
  return moneyNumber(Decimal.max(0, asDecimal(ticketPrice).minus(asDecimal(totalRefunded))));
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
  return moneyNumber(asDecimal(ticketPrice).minus(asDecimal(costPrice)));
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
  const retainedCustomer = Decimal.max(0, asDecimal(totalPaid).minus(asDecimal(totalCustomerRefunded)));
  if (costPrice === null || costPrice === undefined) {
    return moneyNumber(retainedCustomer);
  }
  const netAirlineCost = Decimal.max(0, asDecimal(costPrice).minus(asDecimal(totalAirlineRefunded)));
  return moneyNumber(retainedCustomer.minus(netAirlineCost));
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

  const price = asDecimal(ticketPrice);
  const paid = asDecimal(totalPaid);

  if (price.lessThanOrEqualTo(0)) return 'CONFIRMED';
  if (paid.greaterThanOrEqualTo(price)) return 'CONFIRMED';
  if (paid.greaterThan(0) && paid.lessThan(price)) return 'PARTIALLY PAID';
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

  // Completed/approved refunds
  const completedRefunds = refunds.filter(r => {
    const st = (r.status || '').toUpperCase();
    return st === 'COMPLETED' || st === 'APPROVED' || st === 'REFUNDED';
  });

  // Pending refunds
  const pendingRefunds = refunds.filter(r => {
    const st = (r.status || '').toUpperCase();
    return st === 'PENDING' || st === 'REQUESTED';
  });

  if (completedRefunds.length > 0) {
    const totalPaid = calculateTotalPaid(ticket.payments || []);
    const totalPaidDec = asDecimal(totalPaid);
    const totalRefundedDec = completedRefunds.reduce(
      (sum, r) => sum.plus(asDecimal(r.amount || 0)),
      asDecimal(0)
    );
    const isCompletedCancellation = completedRefunds.some(r => r.isCompletedCancellation === true);

    if (isCompletedCancellation || (totalPaidDec.greaterThan(0) && totalRefundedDec.greaterThanOrEqualTo(totalPaidDec))) {
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
    ? asDecimal(data.ticketPrice)
    : asDecimal(0);
  if (!price.isFinite() || price.lessThan(0)) {
    throw new ValidationError('Ticket price cannot be negative', 'ticketPrice');
  }
  if (data.costPrice !== undefined && data.costPrice !== null && data.costPrice !== '') {
    const cost = asDecimal(data.costPrice);
    if (!cost.isFinite() || cost.lessThan(0)) {
      throw new ValidationError('Cost price cannot be negative', 'costPrice');
    }
  }
  if (data.initialPayment !== undefined && data.initialPayment !== null && data.initialPayment !== '') {
    const initPay = asDecimal(data.initialPayment);
    if (!initPay.isFinite() || initPay.lessThan(0)) {
      throw new ValidationError('Initial payment cannot be negative', 'initialPayment');
    }
    if (initPay.greaterThan(price)) {
      throw new BusinessRuleError(
        `Initial payment (${initPay}) cannot exceed ticket price (${price})`,
        'MAX_INITIAL_PAYMENT',
        { initialPayment: initPay, ticketPrice: price }
      );
    }
  }
  return true;
}

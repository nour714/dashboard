/**
 * AfricaTravel - Ticket Domain Business Rules & Calculations
 *
 * Centralized source of truth for ticket accounting, balances, and status transitions.
 */

import { ValidationError, BusinessRuleError } from './errors.js';
import Decimal from 'decimal.js';
import { asDecimal, moneyNumber } from '../utils/money.js';

/**
 * Calculates total sum of recorded payments
 * @param {Array<{amount: number|string}>} payments
 * @returns {number}
 */
export function calculateTotalPaid(payments = []) {
  if (!Array.isArray(payments)) return 0;
  return moneyNumber(payments.reduce((sum, p) => sum.plus(asDecimal(p.amount)), asDecimal(0)));
}

/**
 * Calculates remaining balance
 * remaining = max(0, ticketPrice - totalPaid)
 * @param {number|string} ticketPrice
 * @param {number|string} totalPaid
 * @returns {number}
 */
export function calculateRemaining(ticketPrice = 0, totalPaid = 0) {
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
 * Calculates total completed refunds
 * @param {Array<{amount: number|string, status: string}>} refunds
 * @returns {number}
 */
export function calculateTotalRefunded(refunds = []) {
  if (!Array.isArray(refunds)) return 0;
  return refunds
    .filter(r => r.status === 'COMPLETED' || r.status === 'Refunded' || r.status === 'APPROVED')
    .reduce((sum, r) => sum.plus(asDecimal(r.amount)), asDecimal(0)).toDecimalPlaces(2).toNumber();
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
 * netValue = max(0, ticketPrice + totalModificationFees - totalRefunded)
 * @param {number|string} ticketPrice
 * @param {number|string} modificationFees
 * @param {number|string} totalRefunded
 * @returns {number}
 */
export function calculateNetValue(ticketPrice = 0, modificationFees = 0, totalRefunded = 0) {
  return moneyNumber(Decimal.max(0, asDecimal(ticketPrice).plus(asDecimal(modificationFees)).minus(asDecimal(totalRefunded))));
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
  const price = asDecimal(ticketPrice);
  const paid = asDecimal(totalPaid);
  if (paid.greaterThanOrEqualTo(price) && price.greaterThan(0)) return 'CONFIRMED';
  if (paid.greaterThan(0) && paid.lessThan(price)) return 'PARTIALLY PAID';
  return 'UNPAID';
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

/**
 * AfricaTravel - Refund Domain Business Rules & Validation
 */

import { ValidationError, BusinessRuleError, NotFoundError } from './errors.js';
import { calculateTotalPaid, calculateTotalRefunded, calculateAvailableRefund } from './ticket-rules.js';
import { asDecimal } from '../utils/money.js';

/**
 * Validates a refund request against a ticket's financial ledger
 * @param {object} ticket
 * @param {object} refundData
 * @returns {boolean}
 */
export function validateRefund(ticket, refundData = {}) {
  if (!ticket) {
    throw new NotFoundError('Ticket');
  }

  const amountDec = asDecimal(refundData.amount);
  if (!amountDec.isFinite() || amountDec.lessThanOrEqualTo(0)) {
    throw new ValidationError('Refund amount must be greater than zero', 'amount');
  }

  const totalPaid = calculateTotalPaid(ticket.payments || []);
  const totalRefunded = calculateTotalRefunded(ticket.refunds || []);
  const availableRefund = calculateAvailableRefund(totalPaid, totalRefunded);
  const availableRefundDec = asDecimal(availableRefund);

  if (amountDec.greaterThan(availableRefundDec)) {
    throw new BusinessRuleError(
      'Refund exceeds the available refundable amount.',
      'REFUND_EXCEEDS_AVAILABLE',
      { amount: amountDec.toNumber(), availableRefund: availableRefundDec.toNumber(), totalPaid, totalRefunded, currency: ticket.currency || 'EGP' }
    );
  }

  if (refundData.reason !== undefined && typeof refundData.reason === 'string' && !refundData.reason.trim()) {
    throw new ValidationError('A refund reason must be specified', 'reason');
  }

  return true;
}

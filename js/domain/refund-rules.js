/**
 * AfriciaTravel — Refund Domain Business Rules & Validation
 */

import { ValidationError, BusinessRuleError, NotFoundError } from './errors.js';
import { calculateTotalPaid, calculateTotalRefunded, calculateAvailableRefund } from './ticket-rules.js';

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

  const amount = Number(refundData.amount);
  if (isNaN(amount) || amount <= 0) {
    throw new ValidationError('Refund amount must be greater than zero', 'amount');
  }

  const totalPaid = calculateTotalPaid(ticket.payments);
  const totalRefunded = calculateTotalRefunded(ticket.refunds);
  const availableRefund = calculateAvailableRefund(totalPaid, totalRefunded);

  if (amount > availableRefund) {
    throw new BusinessRuleError(
      `Refund amount of ${amount.toLocaleString()} ${ticket.currency || 'EGP'} exceeds available refundable balance of ${availableRefund.toLocaleString()} ${ticket.currency || 'EGP'}.`,
      'REFUND_EXCEEDS_AVAILABLE',
      { amount, availableRefund, totalPaid, totalRefunded, currency: ticket.currency }
    );
  }

  if (refundData.reason && typeof refundData.reason === 'string' && !refundData.reason.trim()) {
    throw new ValidationError('A refund reason must be specified', 'reason');
  }

  return true;
}

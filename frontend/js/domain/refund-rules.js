/**
 * AfricaTravel — Refund Domain Business Rules & Validation
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

  const totalPaid = calculateTotalPaid(ticket.payments || []);
  const totalRefunded = calculateTotalRefunded(ticket.refunds || []);
  const availableRefund = calculateAvailableRefund(totalPaid, totalRefunded);

  if (amount > availableRefund) {
    throw new BusinessRuleError(
      'Refund exceeds the available refundable amount.',
      'REFUND_EXCEEDS_AVAILABLE',
      { amount, availableRefund, totalPaid, totalRefunded, currency: ticket.currency || 'EGP' }
    );
  }

  if (refundData.airlineRefundAmount !== undefined) {
    const airlineRefund = Number(refundData.airlineRefundAmount);
    if (isNaN(airlineRefund) || airlineRefund < 0) {
      throw new ValidationError('Airline refund amount cannot be negative', 'airlineRefundAmount');
    }
    const effectiveCost = ticket.costPrice !== null && ticket.costPrice !== undefined
      ? Number(ticket.costPrice)
      : (refundData.costPrice !== undefined && refundData.costPrice !== null ? Number(refundData.costPrice) : null);
    if (effectiveCost !== null && !isNaN(effectiveCost) && airlineRefund > effectiveCost) {
      throw new BusinessRuleError(
        'Airline refund amount cannot exceed ticket cost price.',
        'AIRLINE_REFUND_EXCEEDS_COST',
        { airlineRefund, costPrice: effectiveCost }
      );
    }
  }

  if (refundData.reason !== undefined && typeof refundData.reason === 'string' && !refundData.reason.trim()) {
    throw new ValidationError('A refund reason must be specified', 'reason');
  }

  return true;
}

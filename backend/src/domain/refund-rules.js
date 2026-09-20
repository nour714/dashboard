/**
 * AfricaTravel - Refund Domain Business Rules & Validation
 */

import { ValidationError, BusinessRuleError, NotFoundError } from './errors.js';
import { computeTicketLedger } from './ledger.js';
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

  const status = (ticket.status || '').toUpperCase();
  if (status === 'CANCELLED' || status === 'REFUNDED') {
    throw new BusinessRuleError(
      `Cannot process refund on a ${status} ticket.`,
      'INVALID_TICKET_STATUS'
    );
  }

  const amountDec = asDecimal(refundData.amount);
  if (!amountDec.isFinite() || amountDec.lessThanOrEqualTo(0)) {
    throw new ValidationError('Refund amount must be greater than zero', 'amount');
  }

  if (refundData.currency && ticket.currency && refundData.currency.toUpperCase() !== ticket.currency.toUpperCase()) {
    throw new BusinessRuleError(
      `Refund currency (${refundData.currency}) does not match ticket currency (${ticket.currency}).`,
      'CURRENCY_MISMATCH',
      { refundCurrency: refundData.currency, ticketCurrency: ticket.currency }
    );
  }

  // Ledger computes availableRefund = totalPaid - completed - approved - pending
  const ledger = computeTicketLedger(ticket);
  const availableRefundDec = asDecimal(ledger.availableRefund);

  if (amountDec.greaterThan(availableRefundDec)) {
    throw new BusinessRuleError(
      'Refund exceeds the available refundable amount.',
      'REFUND_EXCEEDS_AVAILABLE',
      {
        amount: amountDec.toNumber(),
        availableRefund: availableRefundDec.toNumber(),
        totalPaid: ledger.totalPaid,
        totalRefunded: ledger.totalRefunded,
        currency: ticket.currency || 'EGP'
      }
    );
  }

  if (refundData.airlineRefundAmount !== undefined && refundData.airlineRefundAmount !== null) {
    const airlineRefundDec = asDecimal(refundData.airlineRefundAmount);
    if (!airlineRefundDec.isFinite() || airlineRefundDec.lessThan(0)) {
      throw new ValidationError('Airline refund amount cannot be negative', 'airlineRefundAmount');
    }

    const effectiveCost = (ticket.costPrice !== null && ticket.costPrice !== undefined)
      ? asDecimal(ticket.costPrice)
      : (refundData.costPrice !== undefined && refundData.costPrice !== null ? asDecimal(refundData.costPrice) : null);

    // Only enforce cap if effectiveCost is known (not null)
    if (effectiveCost !== null && effectiveCost.isFinite() && airlineRefundDec.greaterThan(effectiveCost)) {
      throw new BusinessRuleError(
        'Airline refund amount cannot exceed ticket cost price.',
        'AIRLINE_REFUND_EXCEEDS_COST',
        { airlineRefund: airlineRefundDec.toNumber(), costPrice: effectiveCost.toNumber() }
      );
    }
  }

  if (refundData.reason !== undefined && typeof refundData.reason === 'string' && !refundData.reason.trim()) {
    throw new ValidationError('A refund reason must be specified', 'reason');
  }

  return true;
}

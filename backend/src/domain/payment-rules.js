/**
 * AfricaTravel - Payment Domain Business Rules & Validation
 */

import { ValidationError, BusinessRuleError, NotFoundError } from './errors.js';
import { computeTicketLedger } from './ledger.js';
import { asDecimal } from '../utils/money.js';

/**
 * Validates a payment recording against a ticket's financial ledger
 * @param {object} ticket
 * @param {object} paymentData
 * @returns {boolean}
 */
export function validatePayment(ticket, paymentData = {}) {
  if (!ticket) {
    throw new NotFoundError('Ticket');
  }

  const status = (ticket.status || '').toUpperCase();
  if (status === 'CANCELLED' || status === 'REFUNDED') {
    throw new BusinessRuleError(
      `Cannot record payment on a ${status} ticket.`,
      'INVALID_TICKET_STATUS'
    );
  }

  const amountDec = asDecimal(paymentData.amount);
  if (!amountDec.isFinite() || amountDec.lessThanOrEqualTo(0)) {
    throw new ValidationError('Payment amount must be greater than zero', 'amount');
  }

  // Reject payment currency != ticket currency
  if (paymentData.currency && ticket.currency && paymentData.currency.toUpperCase() !== ticket.currency.toUpperCase()) {
    throw new BusinessRuleError(
      `Payment currency (${paymentData.currency}) does not match ticket currency (${ticket.currency}).`,
      'CURRENCY_MISMATCH',
      { paymentCurrency: paymentData.currency, ticketCurrency: ticket.currency }
    );
  }

  const paymentType = paymentData.type || 'TICKET';
  const ledger = computeTicketLedger(ticket);

  if (paymentType === 'MODIFICATION') {
    if (!Array.isArray(ticket.modifications) || ticket.modifications.length === 0) {
      throw new BusinessRuleError(
        'Cannot record a modification fee payment for a ticket with no modifications.',
        'NO_MODIFICATIONS'
      );
    }

    const modOutstandingDec = asDecimal(ledger.modificationOutstanding);
    if (amountDec.greaterThan(modOutstandingDec)) {
      throw new BusinessRuleError(
        'Payment exceeds outstanding modification fees.',
        'PAYMENT_EXCEEDS_MODIFICATION_FEES',
        {
          amount: amountDec.toNumber(),
          modificationOutstanding: modOutstandingDec.toNumber(),
          currency: ticket.currency || 'EGP'
        }
      );
    }
  } else {
    // TICKET payment
    const remainingDec = asDecimal(ledger.remaining);
    if (amountDec.greaterThan(remainingDec)) {
      throw new BusinessRuleError(
        'Payment exceeds the remaining balance.',
        'PAYMENT_EXCEEDS_BALANCE',
        {
          amount: amountDec.toNumber(),
          remaining: remainingDec.toNumber(),
          currency: ticket.currency || 'EGP'
        }
      );
    }
  }

  if (paymentData.method && typeof paymentData.method === 'string' && !paymentData.method.trim()) {
    throw new ValidationError('Valid payment method is required', 'method');
  }

  return true;
}

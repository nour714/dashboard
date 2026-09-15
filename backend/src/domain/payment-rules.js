/**
 * AfricaTravel - Payment Domain Business Rules & Validation
 */

import { ValidationError, BusinessRuleError, NotFoundError } from './errors.js';
import { calculateTotalPaid, calculateRemaining, calculateTotalModificationFees } from './ticket-rules.js';
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

  const amountDec = asDecimal(paymentData.amount);
  if (!amountDec.isFinite() || amountDec.lessThanOrEqualTo(0)) {
    throw new ValidationError('Payment amount must be greater than zero', 'amount');
  }

  const totalPaid = calculateTotalPaid(ticket.payments || []);
  const totalModFees = calculateTotalModificationFees(ticket.modifications || []);
  const remaining = calculateRemaining(ticket.ticketPrice, totalPaid, totalModFees);
  const remainingDec = asDecimal(remaining);

  if (amountDec.greaterThan(remainingDec)) {
    throw new BusinessRuleError(
      'Payment exceeds the remaining balance.',
      'PAYMENT_EXCEEDS_BALANCE',
      { amount: amountDec.toNumber(), remaining: remainingDec.toNumber(), currency: ticket.currency || 'EGP' }
    );
  }

  if (paymentData.method && typeof paymentData.method === 'string' && !paymentData.method.trim()) {
    throw new ValidationError('Valid payment method is required', 'method');
  }

  return true;
}

/**
 * AfricaTravel — Payment Domain Business Rules & Validation
 */

import { ValidationError, BusinessRuleError, NotFoundError } from './errors.js';
import { calculateTotalPaid, calculateRemaining } from './ticket-rules.js';

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

  const amount = Number(paymentData.amount);
  if (isNaN(amount) || amount <= 0) {
    throw new ValidationError('Payment amount must be greater than zero', 'amount');
  }

  const totalPaid = calculateTotalPaid(ticket.payments);
  const remaining = calculateRemaining(ticket.ticketPrice, totalPaid);

  if (amount > remaining) {
    throw new BusinessRuleError(
      'Payment exceeds the remaining balance.',
      'PAYMENT_EXCEEDS_BALANCE',
      { amount, remaining, currency: ticket.currency || 'EGP' }
    );
  }

  if (paymentData.method && typeof paymentData.method === 'string' && !paymentData.method.trim()) {
    throw new ValidationError('Valid payment method is required', 'method');
  }

  return true;
}


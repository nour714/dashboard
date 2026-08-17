/**
 * AfriciaTravel — Payment Domain Business Rules & Validation
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
      `Payment amount of ${amount.toLocaleString()} ${ticket.currency || 'EGP'} exceeds remaining balance of ${remaining.toLocaleString()} ${ticket.currency || 'EGP'}.`,
      'PAYMENT_EXCEEDS_BALANCE',
      { amount, remaining, currency: ticket.currency }
    );
  }

  if (paymentData.method && !['Credit Card', 'Cash', 'Bank Transfer', 'Corporate Credit', 'POS Terminal'].includes(paymentData.method)) {
    // Allow custom methods but ensure non-empty
    if (typeof paymentData.method !== 'string' || !paymentData.method.trim()) {
      throw new ValidationError('Valid payment method is required', 'method');
    }
  }

  return true;
}

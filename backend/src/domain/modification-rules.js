/**
 * AfricaTravel - Flight Modification Business Rules & Validation
 */

import { ValidationError, BusinessRuleError, NotFoundError } from './errors.js';
import { asDecimal } from '../utils/money.js';

/**
 * Validates a flight schedule modification
 * @param {object} ticket
 * @param {object} modData
 * @returns {boolean}
 */
export function validateModification(ticket, modData = {}) {
  if (!ticket) {
    throw new NotFoundError('Ticket');
  }

  const status = (ticket.status || '').toUpperCase();
  if (status === 'CANCELLED' || status === 'REFUNDED') {
    throw new BusinessRuleError(
      `Cannot modify a ${status} ticket.`,
      'INVALID_TICKET_STATUS'
    );
  }

  const changeFeeDec = asDecimal(modData.changeFee || 0);
  if (!changeFeeDec.isFinite() || changeFeeDec.lessThan(0)) {
    throw new ValidationError('Change fee cannot be negative', 'changeFee');
  }

  const airlineFeeDec = asDecimal(modData.airlineFee || 0);
  if (!airlineFeeDec.isFinite() || airlineFeeDec.lessThan(0)) {
    throw new ValidationError('Airline fee cannot be negative', 'airlineFee');
  }

  if (modData.newDepartureDate) {
    const depTime = new Date(modData.newDepartureDate).getTime();
    if (isNaN(depTime)) {
      throw new ValidationError('Invalid new departure date', 'newDepartureDate');
    }

    if (modData.newArrivalDate) {
      const arrTime = new Date(modData.newArrivalDate).getTime();
      if (isNaN(arrTime)) {
        throw new ValidationError('Invalid new arrival date', 'newArrivalDate');
      }
      if (arrTime < depTime) {
        throw new BusinessRuleError(
          'Invalid flight schedule: arrival cannot be earlier than departure.',
          'ARRIVAL_BEFORE_DEPARTURE'
        );
      }
    }
  }

  if (modData.newReturnDepartureDate) {
    const returnDepTime = new Date(modData.newReturnDepartureDate).getTime();
    if (isNaN(returnDepTime)) {
      throw new ValidationError('Invalid new return departure date', 'newReturnDepartureDate');
    }

    if (modData.newReturnArrivalDate) {
      const returnArrTime = new Date(modData.newReturnArrivalDate).getTime();
      if (isNaN(returnArrTime)) {
        throw new ValidationError('Invalid new return arrival date', 'newReturnArrivalDate');
      }
      if (returnArrTime < returnDepTime) {
        throw new BusinessRuleError(
          'Invalid flight schedule: return arrival cannot be earlier than return departure.',
          'ARRIVAL_BEFORE_DEPARTURE'
        );
      }
    }
  }

  return true;
}

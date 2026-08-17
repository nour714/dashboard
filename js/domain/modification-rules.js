/**
 * AfricaTravel — Flight Modification Business Rules & Validation
 */

import { ValidationError, BusinessRuleError, NotFoundError } from './errors.js';

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

  const changeFee = Number(modData.changeFee);
  if (isNaN(changeFee) || changeFee < 0) {
    throw new ValidationError('Change fee cannot be negative', 'changeFee');
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

  return true;
}


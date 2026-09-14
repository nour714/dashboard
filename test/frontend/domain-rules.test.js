import assert from 'node:assert/strict';
import { test, describe } from 'node:test';
import {
  calculateNetProfit,
  calculateTotalModificationFees,
  calculateTotalModificationProfit,
  calculateRemaining,
  calculateTotalPaid,
  derivePaymentStatus
} from '../../js/domain/ticket-rules.js';
import { validateModification } from '../../js/domain/modification-rules.js';
import { ValidationError, BusinessRuleError, NotFoundError } from '../../js/domain/errors.js';
import {
  calculateTotalModificationProfit as backendCalcModProfit,
  calculateNetProfit as backendCalcNetProfit
} from '../../server/src/domain/ticket-rules.js';

describe('Frontend Domain Rules: ticket-rules.js & modification-rules.js', () => {
  describe('calculateNetProfit', () => {
    test('calculates profit correctly for positive margin', () => {
      assert.strictEqual(calculateNetProfit(5000, 4200), 800);
    });

    test('calculates profit correctly for negative margin', () => {
      assert.strictEqual(calculateNetProfit(4000, 4500), -500);
    });

    test('handles numeric strings properly', () => {
      assert.strictEqual(calculateNetProfit('6500.50', '5000'), 1500.50);
    });

    test('returns null when costPrice is null or undefined (legacy tickets)', () => {
      assert.strictEqual(calculateNetProfit(5000, null), null);
      assert.strictEqual(calculateNetProfit(5000, undefined), null);
    });

    test('matches backend calculateNetProfit exactly', () => {
      const cases = [
        { price: 10000, cost: 8500 },
        { price: 3000, cost: 3500 },
        { price: 5000, cost: null },
        { price: '7200', cost: '6100' }
      ];
      for (const { price, cost } of cases) {
        assert.strictEqual(
          calculateNetProfit(price, cost),
          backendCalcNetProfit(price, cost),
          `Mismatch for price=${price}, cost=${cost}`
        );
      }
    });
  });

  describe('calculateTotalModificationFees', () => {
    test('calculates sum of change fees across multiple modifications', () => {
      const mods = [{ changeFee: 500 }, { changeFee: 300 }, { changeFee: '200' }];
      assert.strictEqual(calculateTotalModificationFees(mods), 1000);
    });

    test('handles empty or non-array input safely', () => {
      assert.strictEqual(calculateTotalModificationFees([]), 0);
      assert.strictEqual(calculateTotalModificationFees(null), 0);
      assert.strictEqual(calculateTotalModificationFees(undefined), 0);
    });

    test('treats null or invalid changeFee as 0', () => {
      const mods = [{ changeFee: null }, { changeFee: 'invalid' }, { changeFee: 450 }];
      assert.strictEqual(calculateTotalModificationFees(mods), 450);
    });
  });

  describe('calculateTotalModificationProfit', () => {
    test('calculates profit margin (changeFee - airlineFee) across modifications', () => {
      const mods = [
        { changeFee: 1200, airlineFee: 800 },
        { changeFee: 600, airlineFee: 400 }
      ];
      assert.strictEqual(calculateTotalModificationProfit(mods), 600);
    });

    test('handles modifications where airline fee equals change fee (zero profit)', () => {
      const mods = [{ changeFee: 500, airlineFee: 500 }];
      assert.strictEqual(calculateTotalModificationProfit(mods), 0);
    });

    test('handles negative modification profit when airline fee exceeds customer fee', () => {
      const mods = [{ changeFee: 300, airlineFee: 500 }];
      assert.strictEqual(calculateTotalModificationProfit(mods), -200);
    });

    test('handles empty or non-array inputs safely', () => {
      assert.strictEqual(calculateTotalModificationProfit([]), 0);
      assert.strictEqual(calculateTotalModificationProfit(null), 0);
    });

    test('matches backend calculateTotalModificationProfit exactly', () => {
      const testCases = [
        [{ changeFee: 1200, airlineFee: 800 }],
        [{ changeFee: 500, airlineFee: 200 }, { changeFee: 300, airlineFee: 400 }],
        [{ changeFee: '850', airlineFee: '600' }],
        []
      ];
      for (const mods of testCases) {
        assert.strictEqual(
          calculateTotalModificationProfit(mods),
          backendCalcModProfit(mods)
        );
      }
    });
  });

  describe('validateModification', () => {
    const mockTicket = {
      id: 'TK-101',
      departureDate: '2026-10-10T10:00:00.000Z',
      arrivalDate: '2026-10-10T14:00:00.000Z'
    };

    test('passes valid flight modification with changeFee and airlineFee', () => {
      const modData = {
        changeFee: 500,
        airlineFee: 300,
        newDepartureDate: '2026-10-15T12:00:00.000Z',
        newArrivalDate: '2026-10-15T16:00:00.000Z'
      };
      assert.strictEqual(validateModification(mockTicket, modData), true);
    });

    test('passes valid flight modification without new arrival date', () => {
      const modData = {
        changeFee: 200,
        airlineFee: 150,
        newDepartureDate: '2026-10-20'
      };
      assert.strictEqual(validateModification(mockTicket, modData), true);
    });

    test('throws NotFoundError when ticket is missing', () => {
      assert.throws(
        () => validateModification(null, { changeFee: 100 }),
        NotFoundError
      );
    });

    test('throws ValidationError when changeFee is negative', () => {
      assert.throws(
        () => validateModification(mockTicket, { changeFee: -50, airlineFee: 0 }),
        (err) => err instanceof ValidationError && err.field === 'changeFee'
      );
    });

    test('throws ValidationError when airlineFee is negative', () => {
      assert.throws(
        () => validateModification(mockTicket, { changeFee: 100, airlineFee: -20 }),
        (err) => err instanceof ValidationError && err.field === 'airlineFee'
      );
    });

    test('throws ValidationError when newDepartureDate is invalid date string', () => {
      assert.throws(
        () => validateModification(mockTicket, {
          changeFee: 100,
          airlineFee: 50,
          newDepartureDate: 'not-a-date'
        }),
        (err) => err instanceof ValidationError && err.field === 'newDepartureDate'
      );
    });

    test('throws BusinessRuleError when arrival is earlier than departure', () => {
      assert.throws(
        () => validateModification(mockTicket, {
          changeFee: 100,
          airlineFee: 50,
          newDepartureDate: '2026-10-20T18:00:00.000Z',
          newArrivalDate: '2026-10-20T12:00:00.000Z'
        }),
        (err) => err instanceof BusinessRuleError && err.rule === 'ARRIVAL_BEFORE_DEPARTURE'
      );
    });
  });
});

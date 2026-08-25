/**
 * AfricaTravel - Backend Domain Business Rules & Calculations Test Suite
 */

import {
  calculateTotalPaid,
  calculateRemaining,
  calculateTotalModificationFees,
  calculateTotalRefunded,
  calculateAvailableRefund,
  calculateNetValue,
  calculateNetProfit,
  derivePaymentStatus,
  validateTicketCreation
} from '../server/src/domain/ticket-rules.js';

import { validatePayment } from '../server/src/domain/payment-rules.js';
import { validateRefund } from '../server/src/domain/refund-rules.js';
import { validateModification } from '../server/src/domain/modification-rules.js';
import {
  AppError,
  ValidationError,
  BusinessRuleError,
  NotFoundError,
  UnauthorizedError,
  ForbiddenError
} from '../server/src/domain/errors.js';

let passed = 0;
let failed = 0;
const failures = [];

function assert(condition, message) {
  if (condition) {
    passed++;
    console.log(`  ✓ ${message}`);
  } else {
    failed++;
    failures.push(message);
    console.error(`  ✗ ${message}`);
  }
}

function assertThrows(fn, expectedErrorType, message) {
  try {
    fn();
    failed++;
    failures.push(`${message} (Expected exception but none was thrown)`);
    console.error(`  ✗ ${message} (Expected exception but none was thrown)`);
  } catch (err) {
    if (expectedErrorType && !(err instanceof expectedErrorType)) {
      failed++;
      failures.push(`${message} (Expected ${expectedErrorType.name} but got ${err.name})`);
      console.error(`  ✗ ${message} (Expected ${expectedErrorType.name} but got ${err.name})`);
    } else {
      passed++;
      console.log(`  ✓ ${message} [${err.name}: ${err.message}]`);
    }
  }
}

console.log('\n🧪 ========================================================');
console.log('   AfricaTravel Backend Domain Business Rules Tests');
console.log('========================================================\n');

// 1. Calculations
console.log('--- 1. Ticket Accounting Calculations ---');
const samplePayments = [{ amount: 10000 }, { amount: 8500 }];
assert(calculateTotalPaid(samplePayments) === 18500, 'calculateTotalPaid sums payment amounts correctly');
assert(calculateTotalPaid([]) === 0, 'calculateTotalPaid handles empty payments');
assert(calculateTotalPaid(null) === 0, 'calculateTotalPaid handles null');

assert(calculateRemaining(18500, 10000) === 8500, 'calculateRemaining calculates price - paid');
assert(calculateRemaining(18500, 20000) === 0, 'calculateRemaining caps at 0 when overpaid');

const sampleMods = [{ changeFee: 1200 }, { changeFee: 300 }];
assert(calculateTotalModificationFees(sampleMods) === 1500, 'calculateTotalModificationFees sums change fees');

const sampleRefunds = [
  { amount: 5000, status: 'COMPLETED' },
  { amount: 2000, status: 'APPROVED' },
  { amount: 1000, status: 'Refunded' },
  { amount: 3000, status: 'REJECTED' }
];
assert(calculateTotalRefunded(sampleRefunds) === 8000, 'calculateTotalRefunded sums only completed/approved refunds');

assert(calculateAvailableRefund(18500, 8000) === 10500, 'calculateAvailableRefund returns totalPaid - totalRefunded');
assert(calculateAvailableRefund(5000, 8000) === 0, 'calculateAvailableRefund caps at 0');

assert(calculateNetValue(18500, 1500, 8000) === 12000, 'calculateNetValue = price + modFees - refunded');

// Net Profit Calculation (Single Source of Truth)
assert(calculateNetProfit(41000, 35000) === 6000, 'calculateNetProfit(41000, 35000) returns 6000 profit');
assert(calculateNetProfit(41000, null) === null, 'calculateNetProfit(41000, null) returns null (legacy ticket)');
assert(calculateNetProfit(41000, undefined) === null, 'calculateNetProfit(41000, undefined) returns null');
assert(calculateNetProfit(35000, 41000) === -6000, 'calculateNetProfit(35000, 41000) returns -6000 (negative profit/loss)');
assert(calculateNetProfit(0, 0) === 0, 'calculateNetProfit(0, 0) returns 0');

// 2. Status Derivation
console.log('\n--- 2. Payment Status Transitions ---');
assert(derivePaymentStatus(18500, 0, 'CONFIRMED') === 'CONFIRMED', 'Status is CONFIRMED with 0 payments');
assert(derivePaymentStatus(18500, 10000, 'CONFIRMED') === 'PARTIALLY PAID', 'Status is PARTIALLY PAID with partial payment');
assert(derivePaymentStatus(18500, 18500, 'CONFIRMED') === 'PAID', 'Status is PAID when full price reached');
assert(derivePaymentStatus(18500, 20000, 'CONFIRMED') === 'PAID', 'Status is PAID when overpaid');
assert(derivePaymentStatus(18500, 18500, 'CANCELLED') === 'CANCELLED', 'Status retains CANCELLED');
assert(derivePaymentStatus(18500, 18500, 'REFUNDED') === 'REFUNDED', 'Status retains REFUNDED');

// 3. Ticket Creation Validation
console.log('\n--- 3. Ticket Creation Domain Validation ---');
assert(validateTicketCreation({ passengerName: 'Ahmed', origin: 'CAI', destination: 'DXB', ticketPrice: 5000 }), 'Valid ticket passes');
assertThrows(() => validateTicketCreation({ origin: 'CAI', destination: 'DXB', ticketPrice: 5000 }), ValidationError, 'Missing passenger name throws ValidationError');
assertThrows(() => validateTicketCreation({ passengerName: 'Ahmed', origin: '', destination: 'DXB', ticketPrice: 5000 }), ValidationError, 'Missing origin throws ValidationError');
assertThrows(() => validateTicketCreation({ passengerName: 'Ahmed', origin: 'CAI', destination: '', ticketPrice: 5000 }), ValidationError, 'Missing destination throws ValidationError');
assertThrows(() => validateTicketCreation({ passengerName: 'Ahmed', origin: 'CAI', destination: 'DXB', ticketPrice: 0 }), ValidationError, 'Zero ticket price throws ValidationError');
assertThrows(() => validateTicketCreation({ passengerName: 'Ahmed', origin: 'CAI', destination: 'DXB', ticketPrice: 5000, initialPayment: 6000 }), BusinessRuleError, 'Initial payment > ticketPrice throws BusinessRuleError');

// 4. Payment Domain Rules (Overpayment Prevention)
console.log('\n--- 4. Payment Domain Validation ---');
const testTicket = {
  id: 'TK-TEST-1',
  ticketPrice: 18500,
  payments: [{ amount: 10000 }],
  refunds: [],
  currency: 'EGP'
};

assert(validatePayment(testTicket, { amount: 5000, method: 'Cash' }), 'Payment within remaining balance (5000 <= 8500) allowed');
assert(validatePayment(testTicket, { amount: 8500, method: 'Cash' }), 'Payment equal to remaining balance (8500) allowed');
assertThrows(() => validatePayment(testTicket, { amount: 9000, method: 'Cash' }), BusinessRuleError, 'Payment exceeding remaining balance (9000 > 8500) blocked by BusinessRuleError');
assertThrows(() => validatePayment(testTicket, { amount: 0 }), ValidationError, 'Zero payment amount rejected');
assertThrows(() => validatePayment(testTicket, { amount: -500 }), ValidationError, 'Negative payment amount rejected');
assertThrows(() => validatePayment(null, { amount: 1000 }), NotFoundError, 'Payment against non-existent ticket throws NotFoundError');

// 5. Refund Domain Rules (Over-refund Prevention)
console.log('\n--- 5. Refund Domain Validation ---');
const testRefundTicket = {
  id: 'TK-TEST-2',
  ticketPrice: 18500,
  payments: [{ amount: 12000 }],
  refunds: [{ amount: 4000, status: 'COMPLETED' }],
  currency: 'EGP'
};
// totalPaid = 12000, totalRefunded = 4000, availableRefund = 8000
assert(validateRefund(testRefundTicket, { amount: 5000, reason: 'Flight cancellation' }), 'Refund within available limit (5000 <= 8000) allowed');
assert(validateRefund(testRefundTicket, { amount: 8000, reason: 'Flight cancellation' }), 'Refund equal to available limit (8000) allowed');
assertThrows(() => validateRefund(testRefundTicket, { amount: 8500, reason: 'Client request' }), BusinessRuleError, 'Refund exceeding available refundable balance (8500 > 8000) blocked by BusinessRuleError');
assertThrows(() => validateRefund(testRefundTicket, { amount: 0, reason: 'Test' }), ValidationError, 'Zero refund rejected');
assertThrows(() => validateRefund(testRefundTicket, { amount: -100, reason: 'Test' }), ValidationError, 'Negative refund rejected');
assertThrows(() => validateRefund(testRefundTicket, { amount: 1000, reason: '' }), ValidationError, 'Empty refund reason rejected');

// 6. Modification Domain Rules (Flight Sequence)
console.log('\n--- 6. Flight Modification Validation ---');
const testModTicket = {
  id: 'TK-TEST-3',
  departureDate: '2023-10-24T10:30:00Z',
  arrivalDate: '2023-10-24T15:45:00Z',
  ticketPrice: 18500
};

assert(validateModification(testModTicket, {
  newDepartureDate: '2023-10-25T10:00:00Z',
  newArrivalDate: '2023-10-25T15:00:00Z',
  changeFee: 500,
  reason: 'Date change'
}), 'Valid future modification allowed');

assertThrows(() => validateModification(testModTicket, {
  newDepartureDate: '2023-10-25T18:00:00Z',
  newArrivalDate: '2023-10-25T14:00:00Z',
  changeFee: 500,
  reason: 'Arrival before departure test'
}), BusinessRuleError, 'New arrival earlier than new departure blocked by BusinessRuleError');

assertThrows(() => validateModification(testModTicket, {
  newDepartureDate: '2023-10-25T10:00:00Z',
  changeFee: -200,
  reason: 'Negative fee test'
}), ValidationError, 'Negative change fee rejected');

// 7. Error Classes Hierarchy
console.log('\n--- 7. Error Hierarchy ---');
const err1 = new ValidationError('Bad field', 'email');
assert(err1 instanceof AppError, 'ValidationError extends AppError');
assert(err1.statusCode === 400, 'ValidationError has 400 statusCode');
assert(err1.field === 'email', 'ValidationError captures field');

const err2 = new BusinessRuleError('Balance issue', 'RULE_1');
assert(err2 instanceof AppError, 'BusinessRuleError extends AppError');
assert(err2.statusCode === 400, 'BusinessRuleError has 400 statusCode');

const err3 = new NotFoundError('Ticket', 'TK-99');
assert(err3 instanceof AppError, 'NotFoundError extends AppError');
assert(err3.statusCode === 404, 'NotFoundError has 404 statusCode');

const err4 = new UnauthorizedError();
assert(err4.statusCode === 401, 'UnauthorizedError has 401 statusCode');

const err5 = new ForbiddenError();
assert(err5.statusCode === 403, 'ForbiddenError has 403 statusCode');

console.log('\n========================================================');
console.log(`Backend Domain Tests: ${passed} passed, ${failed} failed`);
console.log('========================================================\n');

if (failures.length > 0) {
  process.exit(1);
}

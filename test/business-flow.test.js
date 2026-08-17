/**
 * AfriciaTravel / VoyageDesk — Automated Business Flow & Security Regression Test Suite
 *
 * Tests payment, refund, modification validation, store mutation boundary,
 * report dynamic calculations, mock auth boundary, and XSS safety.
 *
 * Run with: node test/business-flow.test.js
 */

import { validatePayment } from '../js/domain/payment-rules.js';
import { validateRefund } from '../js/domain/refund-rules.js';
import { validateModification } from '../js/domain/modification-rules.js';
import {
  calculateTotalPaid,
  calculateRemaining,
  calculateTotalRefunded,
  calculateAvailableRefund,
  calculateNetValue,
  derivePaymentStatus,
  validateTicketCreation
} from '../js/domain/ticket-rules.js';
import { store } from '../js/state/store.js';
import { AuthService } from '../js/services/auth-service.js';
import { TicketService } from '../js/services/ticket-service.js';
import { ReportService, buildReportFromTickets } from '../js/services/report-service.js';
import { escapeHtml, sanitizeText } from '../js/utils/security.js';

let passed = 0;
let failed = 0;
const failures = [];

function assert(condition, testName) {
  if (condition) {
    passed++;
    console.log(`  ✓ ${testName}`);
  } else {
    failed++;
    failures.push(testName);
    console.log(`  ✗ FAIL: ${testName}`);
  }
}

function assertThrows(fn, errorName, testName, expectedMessage = null) {
  try {
    fn();
    failed++;
    failures.push(testName);
    console.log(`  ✗ FAIL (did not throw): ${testName}`);
  } catch (err) {
    const matchesName = err.name === errorName || err.constructor.name === errorName;
    const matchesMessage = expectedMessage ? err.message.includes(expectedMessage) : true;
    if (matchesName && matchesMessage) {
      passed++;
      console.log(`  ✓ ${testName}`);
    } else {
      failed++;
      failures.push(testName + ` (threw ${err.name}: "${err.message}")`);
      console.log(`  ✗ FAIL (threw ${err.name}: "${err.message}"): ${testName}`);
    }
  }
}

// ============================================================
// 1. TICKET CALCULATION TESTS
// ============================================================
console.log('\n═══ 1. Ticket Calculation Tests ═══');

const payments = [
  { amount: 5000 },
  { amount: 3000 },
  { amount: 2000 }
];
assert(calculateTotalPaid(payments) === 10000, 'calculateTotalPaid([5000,3000,2000]) = 10000');
assert(calculateTotalPaid([]) === 0, 'calculateTotalPaid([]) = 0');
assert(calculateTotalPaid(null) === 0, 'calculateTotalPaid(null) = 0');

assert(calculateRemaining(18500, 10000) === 8500, 'calculateRemaining(18500, 10000) = 8500');
assert(calculateRemaining(18500, 18500) === 0, 'calculateRemaining(18500, 18500) = 0');
assert(calculateRemaining(18500, 20000) === 0, 'calculateRemaining: no negative');

const refunds = [
  { amount: 4000, status: 'COMPLETED' },
  { amount: 3000, status: 'Refunded' },
  { amount: 2000, status: 'PENDING' }
];
assert(calculateTotalRefunded(refunds) === 7000, 'calculateTotalRefunded filters by COMPLETED/Refunded');
assert(calculateTotalRefunded([]) === 0, 'calculateTotalRefunded([]) = 0');

assert(calculateAvailableRefund(18500, 7000) === 11500, 'calculateAvailableRefund(18500, 7000) = 11500');
assert(calculateAvailableRefund(7000, 7000) === 0, 'calculateAvailableRefund: fully refunded');
assert(calculateAvailableRefund(5000, 10000) === 0, 'calculateAvailableRefund: no negative');

assert(calculateNetValue(18500, 1200, 7000) === 12700, 'calculateNetValue(18500, 1200, 7000) = 12700');

assert(derivePaymentStatus(18500, 18500) === 'PAID', 'derivePaymentStatus: fully paid');
assert(derivePaymentStatus(18500, 10000) === 'PARTIALLY PAID', 'derivePaymentStatus: partial');
assert(derivePaymentStatus(18500, 0) === 'CONFIRMED', 'derivePaymentStatus: no payments');
assert(derivePaymentStatus(18500, 0, 'CANCELLED') === 'CANCELLED', 'derivePaymentStatus: cancelled');

// ============================================================
// 2. PAYMENT VALIDATION & BOUNDARY TESTS
// ============================================================
console.log('\n═══ 2. Payment Validation Tests ═══');

const ticket18500 = {
  id: 'TK-18500',
  ticketPrice: 18500,
  currency: 'EGP',
  payments: [{ amount: 10000 }],
  refunds: [],
  modifications: []
};

// Valid: 8500 fills remaining
assert(validatePayment(ticket18500, { amount: 8500 }) === true, 'Payment 8500 accepted (exact remaining)');

// Valid: 1 EGP
assert(validatePayment(ticket18500, { amount: 1 }) === true, 'Payment 1 accepted (under remaining)');

// Reject: 8501 exceeds remaining (8500)
assertThrows(
  () => validatePayment(ticket18500, { amount: 8501 }),
  'BusinessRuleError',
  'Payment 8501 rejected with human-readable error',
  'Payment exceeds the remaining balance.'
);

// Reject: after fully paid
const ticketFullyPaid = { ...ticket18500, payments: [{ amount: 18500 }] };
assertThrows(
  () => validatePayment(ticketFullyPaid, { amount: 1 }),
  'BusinessRuleError',
  'Payment 1 rejected when fully paid',
  'Payment exceeds the remaining balance.'
);

// Reject: zero amount
assertThrows(
  () => validatePayment(ticket18500, { amount: 0 }),
  'ValidationError',
  'Payment 0 rejected'
);

// Reject: negative
assertThrows(
  () => validatePayment(ticket18500, { amount: -500 }),
  'ValidationError',
  'Payment -500 rejected'
);

// Reject: null ticket
assertThrows(
  () => validatePayment(null, { amount: 100 }),
  'NotFoundError',
  'Payment with null ticket rejected'
);

// ============================================================
// 3. REFUND VALIDATION TESTS
// ============================================================
console.log('\n═══ 3. Refund Validation Tests ═══');

const ticketForRefund = {
  id: 'TK-REF-1',
  ticketPrice: 18500,
  currency: 'EGP',
  payments: [{ amount: 18500 }],
  refunds: [
    { amount: 4000, status: 'COMPLETED' },
    { amount: 3000, status: 'Refunded' }
  ],
  modifications: []
};
// Available refund: 18500 - 7000 = 11500

// Valid: 5000
assert(validateRefund(ticketForRefund, { amount: 5000 }) === true, 'Refund 5000 accepted');

// Valid: exact remaining
assert(validateRefund(ticketForRefund, { amount: 11500 }) === true, 'Refund 11500 accepted (exact available)');

// Reject: 11501 exceeds available (11500)
assertThrows(
  () => validateRefund(ticketForRefund, { amount: 11501 }),
  'BusinessRuleError',
  'Refund 11501 rejected with human-readable error',
  'Refund exceeds the available refundable amount.'
);

// Reject: zero
assertThrows(
  () => validateRefund(ticketForRefund, { amount: 0 }),
  'ValidationError',
  'Refund 0 rejected'
);

// Reject: negative
assertThrows(
  () => validateRefund(ticketForRefund, { amount: -1000 }),
  'ValidationError',
  'Refund -1000 rejected'
);

// ============================================================
// 4. MODIFICATION VALIDATION TESTS
// ============================================================
console.log('\n═══ 4. Modification Validation Tests ═══');

const ticketForMod = { ticketPrice: 18500, payments: [], refunds: [], modifications: [] };

// Valid: 1200 fee
assert(validateModification(ticketForMod, { changeFee: 1200 }) === true, 'Modification fee 1200 accepted');

// Valid: 0 fee
assert(validateModification(ticketForMod, { changeFee: 0 }) === true, 'Modification fee 0 accepted');

// Reject: negative fee
assertThrows(
  () => validateModification(ticketForMod, { changeFee: -500 }),
  'ValidationError',
  'Modification fee -500 rejected'
);

// Valid: chronological dates
assert(
  validateModification(ticketForMod, {
    changeFee: 0,
    newDepartureDate: '2026-09-15T08:00:00Z',
    newArrivalDate: '2026-09-15T14:00:00Z'
  }) === true,
  'Valid departure before arrival accepted'
);

// Reject: arrival before departure
assertThrows(
  () => validateModification(ticketForMod, {
    changeFee: 0,
    newDepartureDate: '2026-09-15T14:00:00Z',
    newArrivalDate: '2026-09-15T08:00:00Z'
  }),
  'BusinessRuleError',
  'Arrival before departure rejected with human-readable error',
  'Invalid flight schedule: arrival cannot be earlier than departure.'
);

// ============================================================
// 5. TICKET CREATION VALIDATION TESTS
// ============================================================
console.log('\n═══ 5. Ticket Creation Validation ═══');

assert(validateTicketCreation({
  passengerName: 'Ahmed Hassan',
  origin: 'CAI',
  destination: 'DXB',
  ticketPrice: 18500
}) === true, 'Valid ticket creation accepted');

assertThrows(
  () => validateTicketCreation({ passengerName: '', origin: 'CAI', destination: 'DXB', ticketPrice: 18500 }),
  'ValidationError',
  'Empty passenger name rejected'
);

assertThrows(
  () => validateTicketCreation({ passengerName: 'Test', origin: 'CAI', destination: 'DXB', ticketPrice: 0 }),
  'ValidationError',
  'Zero ticket price rejected'
);

assertThrows(
  () => validateTicketCreation({ passengerName: 'Test', origin: 'CAI', destination: 'DXB', ticketPrice: 18500, initialPayment: 20000 }),
  'BusinessRuleError',
  'Initial payment exceeding ticket price rejected'
);

// ============================================================
// 6. STORE MUTATION BOUNDARY TESTS
// ============================================================
console.log('\n═══ 6. Store Mutation Boundary Tests ═══');

// Create test ticket in store
const createdTicket = store.applyTicketCreation({
  passengerName: 'Mutation Test Passenger',
  origin: 'CAI',
  destination: 'LHR',
  ticketPrice: 20000,
  initialPayment: 5000
});

assert(createdTicket && createdTicket.id, 'Store created valid ticket');

const paymentsCountBefore = createdTicket.payments.length;

// Attempt invalid overpayment directly on store: 16000 > 15000 remaining
assertThrows(
  () => store.applyPayment(createdTicket.id, { amount: 16000 }),
  'BusinessRuleError',
  'Store applyPayment strictly blocks overpayment at boundary'
);

// Verify state was not modified
assert(createdTicket.payments.length === paymentsCountBefore, 'Store state remains unmodified after rejected payment');

// Valid payment on store: 5000
const validPay = store.applyPayment(createdTicket.id, { amount: 5000, method: 'Credit Card' });
assert(validPay && validPay.amount === 5000, 'Store applyPayment succeeds on valid amount');
assert(createdTicket.payments.length === paymentsCountBefore + 1, 'Store state updated on valid payment');

// Attempt excessive refund on store: totalPaid = 10000, trying 12000
assertThrows(
  () => store.applyRefund(createdTicket.id, { amount: 12000, reason: 'Test' }),
  'BusinessRuleError',
  'Store applyRefund strictly blocks excessive refund at boundary'
);

// ============================================================
// 7. AUTH SERVICE & BOUNDARY TESTS
// ============================================================
console.log('\n═══ 7. Auth Service Tests ═══');

assert(AuthService.isAuthenticated() === true, 'AuthService: initially authenticated');
const user = AuthService.getCurrentUser();
assert(user && (user.name || user.fullName), 'AuthService: returns current user');

AuthService.logout();
assert(AuthService.isAuthenticated() === false, 'AuthService: logged out successfully');

// Login
AuthService.login('admin@voyagedesk.com', 'password123');
assert(AuthService.isAuthenticated() === true, 'AuthService: logged in successfully');

// ============================================================
// 8. REPORT SERVICE DYNAMIC CALCULATIONS & SEPARATION
// ============================================================
console.log('\n═══ 8. Report Service Dynamic Calculations ═══');

const reportData = ReportService.getReportData();
assert(reportData.dataSource === 'APPLICATION_STATE', 'Report derived from APPLICATION_STATE when tickets exist');
assert(typeof reportData.kpis.totalSales === 'number' && reportData.kpis.totalSales > 0, 'KPI totalSales computed dynamically');
assert(typeof reportData.kpis.totalCollected === 'number', 'KPI totalCollected computed dynamically');
assert(Array.isArray(reportData.employeePerformance), 'Employee performance returned as array');
assert(Array.isArray(reportData.airlinePerformance), 'Airline performance returned as array');

// Fallback test with empty dataset
const emptyReport = buildReportFromTickets([], []);
assert(emptyReport.dataSource === 'DEMO_FALLBACK', 'Empty tickets dataset triggers DEMO_FALLBACK');
assert(emptyReport.kpis.totalTickets === 0, 'Empty tickets KPI totalTickets = 0');
assert(emptyReport.airlinePerformance.length > 0, 'Empty tickets uses mock fallback airlines');

// ============================================================
// 9. XSS / SECURITY TESTS
// ============================================================
console.log('\n═══ 9. XSS Security Tests ═══');

assert(escapeHtml('<script>alert("xss")</script>') === '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;', 'escapeHtml: script tags escaped');
assert(escapeHtml('<img src=x onerror=alert(1)>') === '&lt;img src=x onerror=alert(1)&gt;', 'escapeHtml: img onerror escaped');
assert(escapeHtml('Ahmed & Sara') === 'Ahmed &amp; Sara', 'escapeHtml: ampersand escaped');
assert(escapeHtml("O'Brien") === "O&#039;Brien", 'escapeHtml: single quotes escaped');
assert(escapeHtml(null) === '', 'escapeHtml: null returns empty string');
assert(escapeHtml(undefined) === '', 'escapeHtml: undefined returns empty string');
assert(escapeHtml(12345) === '12345', 'escapeHtml: numbers pass through');
assert(sanitizeText('  test  ') === 'test', 'sanitizeText: trims whitespace');
assert(sanitizeText('<b>bold</b>') === '&lt;b&gt;bold&lt;/b&gt;', 'sanitizeText: escapes HTML');

// ============================================================
// SUMMARY
// ============================================================
console.log('\n══════════════════════════════════════');
console.log(`  Results: ${passed} passed, ${failed} failed`);
console.log('══════════════════════════════════════');

if (failures.length > 0) {
  console.log('\n  Failed tests:');
  failures.forEach(f => console.log(`    - ${f}`));
}

process.exit(failed > 0 ? 1 : 0);

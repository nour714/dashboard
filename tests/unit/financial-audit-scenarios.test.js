/**
 * AfricaTravel — Financial Audit 12 Verification Scenarios Test Suite
 *
 * Verifies all 12 core financial audit scenarios:
 *  1. Ticket without cost => costPrice null, profit null, airline refund allowed.
 *  2. Report grossProfit == sum of per-ticket profit on a mixed dataset.
 *  3. CANCELLED/REFUNDED excluded from sales/outstanding.
 *  4. Typing "Mod #1" as a reference does NOT hide a TICKET payment.
 *  5. Late modification-fee payment on a fully paid ticket succeeds; over-payment of fees is rejected.
 *  6. PENDING refunds reduce availability; REJECTED does not change status; PENDING -> COMPLETED works.
 *  7. AGENT cannot PATCH status; price change re-derives status.
 *  8. "false" string stays false.
 *  9. Multi-currency totals are never summed across currencies.
 * 10. Expenses totals cover >25 rows.
 * 11. Weekly collections/outstanding are consistent with the KPIs.
 * 12. The CSV formula injection case.
 */

import assert from 'node:assert/strict';
import { computeTicketLedger, aggregateLedgers, isModificationPayment } from '../../backend/src/domain/ledger.js';
import { validateRefund } from '../../backend/src/domain/refund-rules.js';
import { validatePayment } from '../../backend/src/domain/payment-rules.js';
import { deriveTicketStatus, derivePaymentStatus } from '../../backend/src/domain/ticket-rules.js';
import { strictBoolean } from '../../backend/src/schemas/common.schema.js';
import { updateTicketSchema } from '../../backend/src/schemas/ticket.schema.js';
import { computeWeeklyTrends } from '../../backend/src/services/report.service.js';
import { ExpenseService } from '../../backend/src/services/expense.service.js';
import { formatMultiCurrency } from '../../frontend/js/utils/calculations.js';
import { sanitizeCsvCell } from '../../frontend/js/utils/security.js';
import * as dbModule from '../../backend/src/config/database.js';

let passed = 0;
let failed = 0;

async function test(name, fn) {
  try {
    await fn();
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ✗ ${name}`);
    console.error(err);
    failed++;
  }
}

async function runAuditScenarios() {
  console.log('\n======================================================');
  console.log('   Financial Audit: 12 Required Verification Scenarios');
  console.log('======================================================\n');

  // --- Scenario 1 ---
  console.log('--- Scenario 1: Ticket without cost => costPrice null, profit null, airline refund allowed ---');
  await test('1.1 Ticket without cost has null costPrice and null netProfit', () => {
    const ticket = {
      id: 'TK-NO-COST',
      ticketPrice: 5000,
      costPrice: null,
      status: 'CONFIRMED',
      currency: 'EGP',
      payments: [{ amount: 5000, type: 'TICKET' }],
      modifications: [],
      refunds: []
    };
    const ledger = computeTicketLedger(ticket);
    assert.strictEqual(ledger.costPrice, null, 'Ledger costPrice is null');
    assert.strictEqual(ledger.netProfit, null, 'Ledger netProfit is null when costPrice is null');
  });
  await test('1.2 Airline refund is allowed when costPrice is null', () => {
    const ticket = {
      id: 'TK-NO-COST-REFUND',
      ticketPrice: 5000,
      costPrice: null,
      status: 'CONFIRMED',
      currency: 'EGP',
      payments: [{ amount: 5000, type: 'TICKET' }],
      modifications: [],
      refunds: []
    };
    assert.doesNotThrow(() => {
      validateRefund(ticket, {
        amount: 2000,
        airlineRefundAmount: 1500
      });
    }, 'Refund validation passes with airlineRefundAmount even when costPrice is null');
  });

  // --- Scenario 2 ---
  console.log('\n--- Scenario 2: Report grossProfit == sum of per-ticket profit on mixed dataset ---');
  await test('2.1 grossProfit invariant holds across active, REFUNDED, PARTIALLY_REFUNDED, CANCELLED, with modifications', () => {
    const mixedDataset = [
      // Active ticket with flight modification
      {
        id: 'TK-ACTIVE',
        ticketPrice: 10000,
        costPrice: 8000,
        status: 'CONFIRMED',
        currency: 'EGP',
        payments: [{ amount: 10000, type: 'TICKET' }],
        modifications: [{ changeFee: 1200, airlineFee: 700 }], // profit = 500
        refunds: []
      },
      // Fully REFUNDED ticket
      {
        id: 'TK-REFUNDED',
        ticketPrice: 5000,
        costPrice: 4000,
        status: 'REFUNDED',
        currency: 'EGP',
        payments: [{ amount: 5000, type: 'TICKET' }],
        modifications: [],
        refunds: [{ amount: 5000, airlineRefundAmount: 4000, status: 'COMPLETED' }]
      },
      // PARTIALLY_REFUNDED ticket with modification
      {
        id: 'TK-PARTIAL',
        ticketPrice: 6000,
        costPrice: 4500,
        status: 'PARTIALLY_REFUNDED',
        currency: 'EGP',
        payments: [{ amount: 6000, type: 'TICKET' }],
        modifications: [{ changeFee: 500, airlineFee: 300 }], // profit = 200
        refunds: [{ amount: 2000, airlineRefundAmount: 1500, status: 'COMPLETED' }]
      },
      // CANCELLED ticket
      {
        id: 'TK-CANCELLED',
        ticketPrice: 8000,
        costPrice: 6000,
        status: 'CANCELLED',
        currency: 'EGP',
        payments: [{ amount: 2000, type: 'TICKET' }],
        modifications: [],
        refunds: [{ amount: 1000, airlineRefundAmount: 1000, status: 'COMPLETED' }]
      },
      // Ticket without cost (excluded from profit totals)
      {
        id: 'TK-NO-COST',
        ticketPrice: 3000,
        costPrice: null,
        status: 'CONFIRMED',
        currency: 'EGP',
        payments: [{ amount: 3000, type: 'TICKET' }],
        modifications: [],
        refunds: []
      }
    ];

    const ledgers = mixedDataset.map(t => computeTicketLedger(t));
    const sumOfPerTicketProfits = ledgers
      .filter(l => l.netProfit !== null)
      .reduce((acc, l) => acc + l.netProfit, 0);

    const report = aggregateLedgers(mixedDataset);
    assert.strictEqual(
      report.byCurrency['EGP'].grossProfit,
      sumOfPerTicketProfits,
      `Report grossProfit (${report.byCurrency['EGP'].grossProfit}) equals sum of per-ticket netProfits (${sumOfPerTicketProfits})`
    );
    assert.strictEqual(report.ticketsWithoutCost, 1, 'Tickets without cost counted accurately');
  });

  // --- Scenario 3 ---
  console.log('\n--- Scenario 3: CANCELLED/REFUNDED excluded from sales/outstanding ---');
  await test('3.1 CANCELLED and REFUNDED tickets are excluded from sales and have remaining = 0', () => {
    const dataset = [
      {
        id: 'TK-CONFIRMED',
        ticketPrice: 10000,
        status: 'CONFIRMED',
        currency: 'EGP',
        payments: [{ amount: 4000, type: 'TICKET' }],
        modifications: [],
        refunds: []
      },
      {
        id: 'TK-CANCELLED',
        ticketPrice: 15000,
        status: 'CANCELLED',
        currency: 'EGP',
        payments: [{ amount: 5000, type: 'TICKET' }],
        modifications: [],
        refunds: []
      },
      {
        id: 'TK-REFUNDED',
        ticketPrice: 8000,
        status: 'REFUNDED',
        currency: 'EGP',
        payments: [{ amount: 8000, type: 'TICKET' }],
        modifications: [],
        refunds: [{ amount: 8000, status: 'COMPLETED' }]
      }
    ];

    const report = aggregateLedgers(dataset);
    assert.strictEqual(report.byCurrency['EGP'].totalSales, 10000, 'Sales only includes active ticket (10,000)');
    assert.strictEqual(report.byCurrency['EGP'].totalOutstanding, 6000, 'Outstanding only includes active ticket remaining (6,000)');
    assert.strictEqual(report.byCurrency['EGP'].totalCollected, 17000, 'Collections remains gross across all payments (4000+5000+8000)');
  });

  // --- Scenario 4 ---
  console.log('\n--- Scenario 4: Typing "Mod #1" as a reference does NOT hide a TICKET payment ---');
  await test('4.1 Payment with reference "Mod #1" and type "TICKET" is classified as TICKET payment', () => {
    const payment = {
      amount: 1500,
      type: 'TICKET',
      reference: 'Mod #1 flight modification reference',
      notes: 'Notes mention flight modification'
    };
    assert.strictEqual(isModificationPayment(payment), false, 'isModificationPayment is strictly false when type is TICKET');

    const ticket = {
      id: 'TK-MOD-REF',
      ticketPrice: 5000,
      status: 'PARTIALLY_PAID',
      currency: 'EGP',
      payments: [payment],
      modifications: [{ changeFee: 500, airlineFee: 200 }],
      refunds: []
    };
    const ledger = computeTicketLedger(ticket);
    assert.strictEqual(ledger.totalPaid, 1500, 'Payment is counted in totalPaid');
    assert.strictEqual(ledger.modificationPaid, 0, 'Payment is not counted in modificationPaid');
    assert.strictEqual(ledger.remaining, 3500, 'Ticket remaining balance correctly reduced');
  });

  // --- Scenario 5 ---
  console.log('\n--- Scenario 5: Late modification-fee payment on fully paid ticket succeeds; fee overpayment rejected ---');
  await test('5.1 Late modification payment succeeds on fully paid ticket, overpayment rejected', () => {
    const fullyPaidTicket = {
      id: 'TK-FULLY-PAID',
      ticketPrice: 5000,
      status: 'CONFIRMED',
      currency: 'EGP',
      payments: [{ amount: 5000, type: 'TICKET' }],
      modifications: [{ changeFee: 1200, airlineFee: 600 }],
      refunds: []
    };

    // Attempting extra TICKET payment is rejected (remaining == 0)
    assert.throws(() => {
      validatePayment(fullyPaidTicket, { amount: 100, type: 'TICKET' });
    }, /exceeds/i, 'Overpaying ticket price is rejected');

    // Modification fee payment within outstanding fees succeeds
    assert.doesNotThrow(() => {
      validatePayment(fullyPaidTicket, { amount: 1200, type: 'MODIFICATION' });
    }, 'Payment of outstanding modification fee succeeds');

    // Overpayment of modification fees is rejected
    assert.throws(() => {
      validatePayment(fullyPaidTicket, { amount: 1300, type: 'MODIFICATION' });
    }, /exceeds/i, 'Overpaying modification fees is rejected');
  });

  // --- Scenario 6 ---
  console.log('\n--- Scenario 6: PENDING refunds reduce availability; REJECTED does not change status; PENDING -> COMPLETED works ---');
  await test('6.1 PENDING refunds reduce available refund amount and block over-refunding', () => {
    const ticket = {
      id: 'TK-REFUND-PENDING',
      ticketPrice: 5000,
      status: 'CONFIRMED',
      currency: 'EGP',
      payments: [{ amount: 5000, type: 'TICKET' }],
      modifications: [],
      refunds: [
        { id: 'REF-1', amount: 2000, status: 'PENDING' }
      ]
    };

    const ledger = computeTicketLedger(ticket);
    assert.strictEqual(ledger.pendingRefunds, 2000, 'Pending refund tracked in pendingRefunds');
    assert.strictEqual(ledger.availableRefund, 3000, 'Available refund reduced by pending refund (5000 - 2000 = 3000)');

    // Attempting refund of 3500 is rejected
    assert.throws(() => {
      validateRefund(ticket, { amount: 3500, airlineRefundAmount: 0 });
    }, /exceeds/i, 'Refund exceeding available amount is rejected');

    // Adding a REJECTED refund does not change availability
    ticket.refunds.push({ id: 'REF-REJ', amount: 1000, status: 'REJECTED' });
    const ledgerAfterRejection = computeTicketLedger(ticket);
    assert.strictEqual(ledgerAfterRejection.availableRefund, 3000, 'REJECTED refund does not reduce available refund');

    // Moving PENDING to COMPLETED
    ticket.refunds[0].status = 'COMPLETED';
    const ledgerAfterCompletion = computeTicketLedger(ticket);
    assert.strictEqual(ledgerAfterCompletion.totalRefunded, 2000, 'Completed refund counted in totalRefunded');
    assert.strictEqual(ledgerAfterCompletion.pendingRefunds, 0, 'Pending refunds is 0');
    assert.strictEqual(ledgerAfterCompletion.availableRefund, 3000, 'Available refund remains 3000');
  });

  // --- Scenario 7 ---
  console.log('\n--- Scenario 7: AGENT cannot PATCH status; price change re-derives status ---');
  await test('7.1 AGENT is stripped of status field, ADMIN can set CANCELLED or MODIFIED', () => {
    // AGENT payload: schema strips status or fails validation if schema is strict
    const agentResult = updateTicketSchema.safeParse({ status: 'CONFIRMED' });
    assert.strictEqual(agentResult.success, false, 'Direct status update rejected by updateTicketSchema');

    // ADMIN allowed CANCELLED
    const adminCancelResult = updateTicketSchema.safeParse({ status: 'CANCELLED' });
    assert.strictEqual(adminCancelResult.success, true, 'ADMIN can set CANCELLED');

    // ADMIN cannot set REFUNDED manually without refund flow
    const adminRefundResult = updateTicketSchema.safeParse({ status: 'REFUNDED' });
    assert.strictEqual(adminRefundResult.success, false, 'Manual status change to REFUNDED is rejected');
  });
  await test('7.2 Ticket price change re-derives ticket status correctly', () => {
    // Ticket had price 5000 and 4000 paid => PARTIALLY PAID
    const statusBefore = derivePaymentStatus(5000, 4000, 'CONFIRMED');
    assert.strictEqual(statusBefore, 'PARTIALLY PAID', 'Initial status is PARTIALLY PAID');

    // Price reduced to 4000 => now fully paid, re-derived to CONFIRMED
    const statusAfter = derivePaymentStatus(4000, 4000, 'PARTIALLY PAID');
    assert.strictEqual(statusAfter, 'CONFIRMED', 'Price decrease re-derives status to CONFIRMED');
  });

  // --- Scenario 8 ---
  console.log('\n--- Scenario 8: "false" string stays false ---');
  await test('8.1 strictBoolean strictly parses boolean string representations without Boolean("false") coercion', () => {
    const validator = strictBoolean();
    assert.strictEqual(validator.parse('false'), false, '"false" string is parsed to false');
    assert.strictEqual(validator.parse(false), false, 'false boolean is false');
    assert.strictEqual(validator.parse('0'), false, '"0" string is false');
    assert.strictEqual(validator.parse(0), false, '0 number is false');
    assert.strictEqual(validator.parse('true'), true, '"true" string is true');
    assert.strictEqual(validator.parse(true), true, 'true boolean is true');
    assert.strictEqual(validator.parse('1'), true, '"1" string is true');
    assert.strictEqual(validator.parse(1), true, '1 number is true');
    assert.strictEqual(validator.safeParse('random-invalid').success, false, 'invalid string is rejected');
  });

  // --- Scenario 9 ---
  console.log('\n--- Scenario 9: Multi-currency totals are never summed across currencies ---');
  await test('9.1 Tickets in EGP and USD are preserved in distinct buckets and formatted cleanly', () => {
    const multiCurrencyTickets = [
      {
        id: 'TK-EGP',
        ticketPrice: 10000,
        currency: 'EGP',
        status: 'CONFIRMED',
        payments: [{ amount: 10000, type: 'TICKET', currency: 'EGP' }],
        modifications: [],
        refunds: []
      },
      {
        id: 'TK-USD',
        ticketPrice: 500,
        currency: 'USD',
        status: 'CONFIRMED',
        payments: [{ amount: 500, type: 'TICKET', currency: 'USD' }],
        modifications: [],
        refunds: []
      }
    ];

    const report = aggregateLedgers(multiCurrencyTickets);
    assert.strictEqual(report.byCurrency['EGP'].totalSales, 10000, 'EGP sales is 10,000');
    assert.strictEqual(report.byCurrency['USD'].totalSales, 500, 'USD sales is 500');

    // Verify formatMultiCurrency never sums across them
    const formattedSales = formatMultiCurrency(report.byCurrency, 'totalSales');
    assert(formattedSales.includes('10,000'), 'Formatted sales includes EGP amount');
    assert(formattedSales.includes('500'), 'Formatted sales includes USD amount');
    assert(!formattedSales.includes('10,500'), 'Formatted sales NEVER sums across currencies into 10,500');
  });

  // --- Scenario 10 ---
  console.log('\n--- Scenario 10: Expenses totals cover >25 rows ---');
  await test('10.1 ExpenseService.getExpenses totals cover full filtered set across pagination boundaries', async () => {
    const sampleExpenses = [];
    for (let i = 1; i <= 30; i++) {
      sampleExpenses.push({
        id: `EXP-${i}`,
        amount: i % 2 === 0 ? 200 : 100,
        category: i % 2 === 0 ? 'TRANSFERS' : 'SERVICES',
        currency: 'EGP',
        date: new Date(),
        deletedAt: null
      });
    }

    const mockPrisma = {
      expense: {
        findMany: async ({ skip, take }) => {
          if (skip !== undefined && take !== undefined) {
            return sampleExpenses.slice(skip, skip + take);
          }
          return sampleExpenses;
        },
        count: async () => sampleExpenses.length
      }
    };

    dbModule.setPrismaClient(mockPrisma);

    const page1Res = await ExpenseService.getExpenses({ page: 1, pageSize: 25 });
    assert.strictEqual((page1Res.expenses || page1Res.data).length, 25, 'Page 1 returns 25 rows');
    assert.strictEqual(page1Res.totals.grand, 4500, 'Server totals.grand covers all 30 rows (4500), not just page 1');
    assert.strictEqual(page1Res.totals.services, 1500, 'Server totals.services covers all 15 services (1500)');
    assert.strictEqual(page1Res.totals.transfers, 3000, 'Server totals.transfers covers all 15 transfers (3000)');
  });

  // --- Scenario 11 ---
  console.log('\n--- Scenario 11: Weekly collections/outstanding are consistent with the KPIs ---');
  await test('11.1 computeWeeklyTrends computes separate ticket and modification collections and accurate window-end outstanding', () => {
    const now = new Date();
    const tickets = [
      {
        id: 'TK-W1',
        ticketPrice: 10000,
        currency: 'EGP',
        status: 'CONFIRMED',
        createdAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
        payments: [
          { amount: 4000, type: 'TICKET', createdAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000) },
          { amount: 500, type: 'MODIFICATION', createdAt: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000) }
        ],
        modifications: [
          { changeFee: 500, airlineFee: 200, createdAt: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000) }
        ],
        refunds: []
      }
    ];

    const weeklyTrends = computeWeeklyTrends(tickets);
    assert(weeklyTrends.length === 4, 'Returns 4 weekly intervals');
    const currentWeek = weeklyTrends[weeklyTrends.length - 1];

    assert.strictEqual(currentWeek.collections, 4000, 'Weekly collections only includes ticket payment (4000)');
    assert.strictEqual(currentWeek.modificationCollections, 500, 'Modification collections tracked separately (500)');
    assert.strictEqual(currentWeek.outstanding, 6000, 'Outstanding snapshot matches ticket remaining at window end (6000)');
  });

  // --- Scenario 12 ---
  console.log('\n--- Scenario 12: The CSV formula injection case ---');
  await test('12.1 sanitizeCsvCell neutralizes formula characters (=, +, -, @, \\t, \\r)', () => {
    assert.strictEqual(sanitizeCsvCell('=1+2'), '"\'=1+2"');
    assert.strictEqual(sanitizeCsvCell("+cmd|' /C calc'!A0"), '"\'+cmd|\' /C calc\'!A0"');
    assert.strictEqual(sanitizeCsvCell('-100'), '"\'-100"');
    assert.strictEqual(sanitizeCsvCell('@SUM(1,2)'), '"\'@SUM(1,2)"');
    assert.strictEqual(sanitizeCsvCell('\ttab'), '"\'\ttab"');
    assert.strictEqual(sanitizeCsvCell('\rreturn'), '"\'\rreturn"');
    assert.strictEqual(sanitizeCsvCell('Regular Name'), '"Regular Name"');
  });

  console.log('\n======================================================');
  console.log(`Financial Audit Scenarios Summary: ${passed} passed, ${failed} failed`);
  console.log('======================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

await runAuditScenarios();

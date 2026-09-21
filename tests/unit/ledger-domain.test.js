/**
 * AfricaTravel - Ledger Domain & Profit Rules Unit Test Suite
 *
 * Verifies single source of truth ledger engine:
 * 1. Active ticket profit: price - cost + modificationProfit
 * 2. Cancelled / Refunded / Partially Refunded profit rules
 * 3. CostPrice null => netProfit null & ticketsWithoutCost count
 * 4. Remaining = 0 for CANCELLED/REFUNDED
 * 5. Invariant: sum of per-ticket netProfit == aggregate grossProfit
 * 6. Sales, outstanding, collectionRate exclude CANCELLED/REFUNDED
 * 7. Segregation of modification fees and modification payments
 * 8. Currency-grouped aggregation without cross-currency summation
 */

import assert from 'node:assert/strict';
import { test, describe } from 'node:test';
import { computeTicketLedger, aggregateLedgers, isModificationPayment } from '../../backend/src/domain/ledger.js';

describe('Financial Ledger Domain Engine (Single Source of Truth)', () => {

  test('Active ticket: profit = price - cost + modificationProfit', () => {
    const ticket = {
      ticketPrice: 10000,
      costPrice: 8000,
      status: 'CONFIRMED',
      currency: 'EGP',
      payments: [
        { amount: 10000, type: 'TICKET' }
      ],
      modifications: [
        { changeFee: 1500, airlineFee: 1000 }
      ]
    };

    const ledger = computeTicketLedger(ticket);
    assert.equal(ledger.totalPaid, 10000);
    assert.equal(ledger.remaining, 0);
    assert.equal(ledger.modificationFees, 1500);
    assert.equal(ledger.modificationProfit, 500);
    // 10000 - 8000 + 500 = 2500
    assert.equal(ledger.netProfit, 2500);
    assert.equal(ledger.paymentStatus, 'CONFIRMED');
  });

  test('Ticket without costPrice: netProfit is null, airline refund allowed', () => {
    const ticket = {
      ticketPrice: 12000,
      costPrice: null,
      status: 'CONFIRMED',
      currency: 'EGP',
      payments: [{ amount: 12000, type: 'TICKET' }],
      refunds: [
        { amount: 2000, airlineRefundAmount: 1500, status: 'COMPLETED' }
      ]
    };

    const ledger = computeTicketLedger(ticket);
    assert.equal(ledger.netProfit, null);
    assert.equal(ledger.totalRefunded, 2000);
    assert.equal(ledger.totalAirlineRefunded, 1500);
  });

  test('Cancelled & Refunded tickets: remaining is 0, profit uses retained formula', () => {
    const cancelledTicket = {
      ticketPrice: 10000,
      costPrice: 8000,
      status: 'CANCELLED',
      currency: 'EGP',
      payments: [{ amount: 10000, type: 'TICKET' }],
      refunds: [{ amount: 7000, airlineRefundAmount: 6000, status: 'COMPLETED' }],
      modifications: [{ changeFee: 500, airlineFee: 200 }]
    };

    const ledger = computeTicketLedger(cancelledTicket);
    // remaining is strictly 0 for CANCELLED
    assert.equal(ledger.remaining, 0);
    assert.equal(ledger.totalPaid, 10000);
    assert.equal(ledger.totalRefunded, 7000);
    assert.equal(ledger.totalAirlineRefunded, 6000);
    assert.equal(ledger.modificationProfit, 300);
    // retained customer = max(0, 10000 - 7000) = 3000
    // net airline cost = max(0, 8000 - 6000) = 2000
    // netProfit = 3000 - 2000 + 300 = 1300
    assert.equal(ledger.netProfit, 1300);

    const refundedTicket = {
      ticketPrice: 15000,
      costPrice: 12000,
      status: 'REFUNDED',
      currency: 'EGP',
      payments: [{ amount: 15000, type: 'TICKET' }],
      refunds: [{ amount: 15000, airlineRefundAmount: 12000, status: 'COMPLETED' }]
    };

    const refLedger = computeTicketLedger(refundedTicket);
    assert.equal(refLedger.remaining, 0);
    // retained = 0, net airline cost = 0 => netProfit = 0
    assert.equal(refLedger.netProfit, 0);
  });

  test('PARTIALLY_REFUNDED ticket: uses refunded-profit formula', () => {
    const ticket = {
      ticketPrice: 10000,
      costPrice: 7000,
      status: 'PARTIALLY_REFUNDED',
      currency: 'EGP',
      payments: [{ amount: 10000, type: 'TICKET' }],
      refunds: [{ amount: 3000, airlineRefundAmount: 2000, status: 'COMPLETED' }]
    };

    const ledger = computeTicketLedger(ticket);
    // retained customer = 10000 - 3000 = 7000
    // net airline cost = 7000 - 2000 = 5000
    // profit = 7000 - 5000 = 2000
    assert.equal(ledger.netProfit, 2000);
  });

  test('Available refund accounts for pending refunds', () => {
    const ticket = {
      ticketPrice: 10000,
      costPrice: 8000,
      status: 'PARTIALLY PAID',
      currency: 'EGP',
      payments: [{ amount: 8000, type: 'TICKET' }],
      refunds: [
        { amount: 2000, status: 'COMPLETED' },
        { amount: 1500, status: 'PENDING' },
        { amount: 5000, status: 'REJECTED' }
      ]
    };

    const ledger = computeTicketLedger(ticket);
    assert.equal(ledger.totalPaid, 8000);
    assert.equal(ledger.totalRefunded, 2000);
    assert.equal(ledger.pendingRefunds, 1500);
    // availableRefund = 8000 - 2000 - 1500 = 4500 (REJECTED ignored)
    assert.equal(ledger.availableRefund, 4500);
  });

  test('Modification fee payments do NOT mix into base totalPaid', () => {
    const ticket = {
      ticketPrice: 10000,
      costPrice: 8000,
      status: 'CONFIRMED',
      currency: 'EGP',
      payments: [
        { amount: 10000, type: 'TICKET' },
        { amount: 3000, type: 'MODIFICATION', reference: 'Mod #1' }
      ],
      modifications: [
        { changeFee: 3000, airlineFee: 2000 }
      ]
    };

    const ledger = computeTicketLedger(ticket);
    assert.equal(ledger.totalPaid, 10000);
    assert.equal(ledger.modificationPaid, 3000);
    assert.equal(ledger.modificationFees, 3000);
    assert.equal(ledger.modificationOutstanding, 0);
  });

  test('INVARIANT: sum of per-ticket netProfit == report grossProfit across mixed dataset', () => {
    const mixedTickets = [
      // 1. Active ticket with cost
      {
        id: 'T1',
        ticketPrice: 10000,
        costPrice: 8000,
        status: 'CONFIRMED',
        currency: 'EGP',
        payments: [{ amount: 10000, type: 'TICKET' }]
      },
      // 2. Active ticket with modification
      {
        id: 'T2',
        ticketPrice: 15000,
        costPrice: 12000,
        status: 'CONFIRMED',
        currency: 'EGP',
        payments: [{ amount: 15000, type: 'TICKET' }],
        modifications: [{ changeFee: 2000, airlineFee: 1200 }]
      },
      // 3. Cancelled ticket
      {
        id: 'T3',
        ticketPrice: 12000,
        costPrice: 9000,
        status: 'CANCELLED',
        currency: 'EGP',
        payments: [{ amount: 12000, type: 'TICKET' }],
        refunds: [{ amount: 8000, airlineRefundAmount: 7000, status: 'COMPLETED' }]
      },
      // 4. Refunded ticket
      {
        id: 'T4',
        ticketPrice: 8000,
        costPrice: 6000,
        status: 'REFUNDED',
        currency: 'EGP',
        payments: [{ amount: 8000, type: 'TICKET' }],
        refunds: [{ amount: 8000, airlineRefundAmount: 6000, status: 'COMPLETED' }]
      },
      // 5. Partially refunded ticket
      {
        id: 'T5',
        ticketPrice: 20000,
        costPrice: 15000,
        status: 'PARTIALLY_REFUNDED',
        currency: 'EGP',
        payments: [{ amount: 20000, type: 'TICKET' }],
        refunds: [{ amount: 5000, airlineRefundAmount: 4000, status: 'COMPLETED' }]
      },
      // 6. Ticket without cost (profit is null, excluded from grossProfit)
      {
        id: 'T6',
        ticketPrice: 7000,
        costPrice: null,
        status: 'CONFIRMED',
        currency: 'EGP',
        payments: [{ amount: 7000, type: 'TICKET' }]
      }
    ];

    // Compute individually
    let sumPerTicketNetProfit = 0;
    let countWithoutCost = 0;

    mixedTickets.forEach(t => {
      const l = computeTicketLedger(t);
      if (l.netProfit !== null) {
        sumPerTicketNetProfit += l.netProfit;
      } else {
        countWithoutCost++;
      }
    });

    const report = aggregateLedgers(mixedTickets);
    assert.equal(report.ticketsWithoutCost, countWithoutCost, 'Tickets without cost accurately counted');
    assert.equal(report.grossProfit, sumPerTicketNetProfit, 'INVARIANT: sum of per-ticket netProfit == report grossProfit');

    // Verify sales excludes CANCELLED (T3) and REFUNDED (T4)
    // Active tickets: T1 (10000), T2 (15000), T5 (20000), T6 (7000) => 52000
    assert.equal(report.totalSales, 52000, 'Sales excludes CANCELLED and REFUNDED');
  });

  test('Multi-currency isolation: ledgers are grouped per currency without mixing', () => {
    const multiTickets = [
      { ticketPrice: 10000, costPrice: 8000, status: 'CONFIRMED', currency: 'EGP', payments: [{ amount: 10000, type: 'TICKET' }] },
      { ticketPrice: 500, costPrice: 400, status: 'CONFIRMED', currency: 'USD', payments: [{ amount: 500, type: 'TICKET' }] },
      { ticketPrice: 200, costPrice: 150, status: 'CONFIRMED', currency: 'EUR', payments: [{ amount: 200, type: 'TICKET' }] }
    ];

    const agg = aggregateLedgers(multiTickets);
    assert.equal(agg.byCurrency.EGP.sales, 10000);
    assert.equal(agg.byCurrency.USD.sales, 500);
    assert.equal(agg.byCurrency.EUR.sales, 200);

    // Ensure there is no cross-currency addition like 10000 + 500 + 200
    assert.notEqual(agg.byCurrency.EGP.sales, 10700);
  });

});

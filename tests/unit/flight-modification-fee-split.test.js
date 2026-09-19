/**
 * AfricaTravel — Flight Modification Fee Split & Date-Only Inputs Tests
 *
 * Verifies:
 * 1. addModificationSchema accepts YYYY-MM-DD date-only inputs and airlineFee.
 * 2. addModificationSchema rejects negative airlineFee.
 * 3. Domain calculations: calculateTotalModificationProfit computes changeFee - airlineFee.
 * 4. enrichTicketFinancials incorporates modificationProfit into netProfit (e.g. +400 for 1200 changeFee / 800 airlineFee).
 * 5. Role sanitization: airlineFee is stripped for AGENT / TICKET_ONLY and preserved for ADMIN.
 * 6. TicketService.addModification persists airlineFee and updates departure date.
 */

import assert from 'node:assert/strict';
import { test, describe, before, after } from 'node:test';
import { addModificationSchema } from '../../backend/src/schemas/modification.schema.js';
import { addRefundSchema } from '../../backend/src/schemas/refund.schema.js';
import {
  calculateTotalModificationFees,
  calculateTotalModificationProfit,
  calculateTotalRefunded,
  calculateTotalAirlineRefunded,
  calculateNetProfit,
  calculateRefundedNetProfit
} from '../../backend/src/domain/ticket-rules.js';
import { validateModification } from '../../backend/src/domain/modification-rules.js';
import { validateRefund } from '../../backend/src/domain/refund-rules.js';
import { enrichTicketFinancials, TicketService } from '../../backend/src/services/ticket.service.js';
import { sanitizeTicketForRole } from '../../backend/src/controllers/ticket.controller.js';
import { setPrismaClient, getPrismaClient } from '../../backend/src/config/database.js';

describe('Flight Modification Fee Split & Date-Only Input Tests', () => {
  const originalPrisma = getPrismaClient();

  const mockTickets = new Map();
  const mockModifications = [];
  const mockPayments = [];
  const mockRefunds = [];
  const mockAuditLogs = [];

  before(() => {
    const mockPrisma = {
      ticket: {
        findUnique: async ({ where, include }) => {
          const t = mockTickets.get(where.id);
          if (!t) return null;
          const mods = mockModifications.filter(m => m.ticketId === t.id);
          const pays = mockPayments.filter(p => p.ticketId === t.id);
          const refs = mockRefunds.filter(r => r.ticketId === t.id);
          return {
            ...t,
            payments: pays,
            refunds: refs,
            modifications: mods
          };
        },
        findFirst: async ({ where }) => {
          const queryId = where?.id || (where?.OR && (where.OR[0]?.id || where.OR[1]?.ticketNumber || where.OR[2]?.pnr));
          const t = [...mockTickets.values()].find(item =>
            item.id === queryId || item.ticketNumber === queryId || item.pnr === queryId
          );
          if (!t) return null;
          const mods = mockModifications.filter(m => m.ticketId === t.id);
          const pays = mockPayments.filter(p => p.ticketId === t.id);
          const refs = mockRefunds.filter(r => r.ticketId === t.id);
          return {
            ...t,
            payments: pays,
            refunds: refs,
            modifications: mods
          };
        },
        update: async ({ where, data }) => {
          const t = mockTickets.get(where.id);
          if (!t) throw new Error('Not found');
          const updated = { ...t, ...data };
          mockTickets.set(where.id, updated);
          return updated;
        }
      },
      modification: {
        create: async ({ data }) => {
          mockModifications.push(data);
          return { ...data };
        }
      },
      payment: {
        create: async ({ data }) => {
          mockPayments.push(data);
          return { ...data };
        }
      },
      refund: {
        create: async ({ data }) => {
          mockRefunds.push(data);
          return { ...data };
        }
      },
      auditLog: {
        create: async ({ data }) => {
          mockAuditLogs.push(data);
          return { ...data };
        }
      },
      $transaction: async (fn) => {
        return await fn(mockPrisma);
      }
    };

    setPrismaClient(mockPrisma);
  });

  after(() => {
    setPrismaClient(originalPrisma);
  });

  test('1. addModificationSchema accepts date-only YYYY-MM-DD and airlineFee', () => {
    const payload = {
      flightNumber: 'MS 777',
      newDepartureDate: '2026-09-20',
      newArrivalDate: '2026-09-21',
      changeFee: 1200,
      airlineFee: 800,
      reason: 'Passenger requested schedule adjustment',
      note: 'Change approved by supervisor'
    };

    const parsed = addModificationSchema.safeParse(payload);
    assert.equal(parsed.success, true, 'addModificationSchema should accept YYYY-MM-DD and airlineFee');
    assert.equal(parsed.data.changeFee, 1200);
    assert.equal(parsed.data.airlineFee, 800);
    assert.equal(parsed.data.newDepartureDate, '2026-09-20');
  });

  test('2. addModificationSchema defaults airlineFee to 0 and rejects negative airlineFee', () => {
    const defaultPayload = {
      newDepartureDate: '2026-09-20',
      changeFee: 1200,
      reason: 'Passenger request'
    };
    const parsedDefault = addModificationSchema.safeParse(defaultPayload);
    assert.equal(parsedDefault.success, true);
    assert.equal(parsedDefault.data.airlineFee, 0, 'airlineFee defaults to 0');

    const negativePayload = {
      newDepartureDate: '2026-09-20',
      changeFee: 1200,
      airlineFee: -50,
      reason: 'Passenger request'
    };
    const parsedNeg = addModificationSchema.safeParse(negativePayload);
    assert.equal(parsedNeg.success, false, 'Negative airlineFee must be rejected');
  });

  test('3. validateModification domain rule accepts YYYY-MM-DD date and non-negative airlineFee', () => {
    const ticket = { id: 'TK-MOD-01', departureDate: '2026-09-10' };

    assert.equal(
      validateModification(ticket, {
        newDepartureDate: '2026-09-20',
        newArrivalDate: '2026-09-21',
        changeFee: 1200,
        airlineFee: 800
      }),
      true
    );

    assert.throws(() => {
      validateModification(ticket, {
        newDepartureDate: '2026-09-20',
        changeFee: 1200,
        airlineFee: -100
      });
    }, /Airline fee cannot be negative/);
  });

  test('4. calculateTotalModificationProfit correctly calculates net profit from modifications', () => {
    const modifications = [
      { changeFee: 1200, airlineFee: 800 },  // profit = 400
      { changeFee: 500, airlineFee: 350 },   // profit = 150
      { changeFee: 300 }                     // profit = 300 (airlineFee defaults to 0)
    ];

    const totalProfit = calculateTotalModificationProfit(modifications);
    assert.equal(totalProfit, 850, 'Total modification profit should sum (changeFee - airlineFee)');

    assert.equal(calculateTotalModificationProfit([]), 0);
    assert.equal(calculateTotalModificationProfit(null), 0);
  });

  test('5. enrichTicketFinancials tracks base netProfit with modification profit tracked independently', () => {
    // Ticket: selling 10000, cost 8000 => base netProfit = 2000
    // Modification: changeFee 1200, airlineFee 800 => modificationProfit = 400
    // Base ticket netProfit remains 2000
    const ticket = {
      id: 'TK-PROFIT-1',
      ticketPrice: 10000,
      costPrice: 8000,
      currency: 'EGP',
      status: 'CONFIRMED',
      payments: [{ amount: 10000 }],
      refunds: [],
      modifications: [
        { changeFee: 1200, airlineFee: 800 }
      ]
    };

    const enriched = enrichTicketFinancials(ticket);
    assert.equal(enriched.costPrice, 8000);
    assert.equal(enriched.netProfit, 2000, 'netProfit should be base profit (2000) - modification profit is independent');
    assert.equal(enriched.financials.modificationFees, 1200);
    assert.equal(enriched.financials.modificationProfit, 400);
    assert.equal(enriched.financials.netProfit, 2000);
  });

  test('6. enrichTicketFinancials preserves null netProfit if ticket has no costPrice', () => {
    const legacyTicket = {
      id: 'TK-LEGACY-1',
      ticketPrice: 10000,
      costPrice: null,
      currency: 'EGP',
      status: 'CONFIRMED',
      payments: [],
      refunds: [],
      modifications: [
        { changeFee: 1200, airlineFee: 800 }
      ]
    };

    const enriched = enrichTicketFinancials(legacyTicket);
    assert.equal(enriched.netProfit, null, 'netProfit remains null when costPrice is null');
  });

  test('7. sanitizeTicketForRole hides airlineFee for non-admin and preserves for admin', () => {
    const ticketWithMods = {
      id: 'TK-ROLE-1',
      ticketPrice: 10000,
      costPrice: 8000,
      netProfit: 2400,
      modifications: [
        { id: 'MOD-1', changeFee: 1200, airlineFee: 800, title: 'Modification #1' }
      ]
    };

    // For AGENT
    const agentSanitized = sanitizeTicketForRole(ticketWithMods, 'AGENT');
    assert.equal(agentSanitized.costPrice, undefined, 'costPrice stripped for AGENT');
    assert.equal(agentSanitized.netProfit, undefined, 'netProfit stripped for AGENT');
    assert.equal(agentSanitized.modifications[0].changeFee, 1200, 'changeFee kept for AGENT');
    assert.equal(agentSanitized.modifications[0].airlineFee, undefined, 'airlineFee stripped for AGENT');

    // For TICKET_ONLY
    const ticketOnlySanitized = sanitizeTicketForRole(ticketWithMods, 'TICKET_ONLY');
    assert.equal(ticketOnlySanitized.modifications[0].airlineFee, undefined, 'airlineFee stripped for TICKET_ONLY');

    // For ADMIN
    const adminSanitized = sanitizeTicketForRole(ticketWithMods, 'ADMIN');
    assert.equal(adminSanitized.costPrice, 8000, 'costPrice kept for ADMIN');
    assert.equal(adminSanitized.netProfit, 2400, 'netProfit kept for ADMIN');
    assert.equal(adminSanitized.modifications[0].airlineFee, 800, 'airlineFee kept for ADMIN');
  });

  test('8. End-to-end: TicketService.addModification stores airlineFee and updates dates', async () => {
    const testTicket = {
      id: 'TK-E2E-MOD-1',
      customerId: 'CUST-1',
      passengerName: 'Jane Doe',
      flightNumber: 'MS 901',
      origin: 'CAI',
      destination: 'JED',
      departureDate: new Date('2026-09-10T10:00:00Z'),
      arrivalDate: new Date('2026-09-10T14:00:00Z'),
      ticketPrice: 15000,
      costPrice: 12000,
      currency: 'EGP',
      status: 'CONFIRMED'
    };
    mockTickets.set(testTicket.id, testTicket);

    const adminUser = { id: 'USR-ADMIN', name: 'Admin User', role: 'ADMIN' };

    const resultMod = await TicketService.addModification(testTicket.id, {
      flightNumber: 'MS 905',
      newDepartureDate: '2026-09-25',
      newArrivalDate: '2026-09-26',
      changeFee: 1200,
      airlineFee: 800,
      reason: 'Passenger requested schedule adjustment',
      note: 'Processed via split fee modal'
    }, adminUser);

    assert.equal(resultMod.ticketId, testTicket.id);
    assert.equal(resultMod.changeFee, 1200);
    assert.equal(resultMod.airlineFee, 800);

    // Verify ticket departure date was updated
    const updatedTicket = await TicketService.getTicketById(testTicket.id);
    assert.equal(new Date(updatedTicket.departureDate).toISOString().slice(0, 10), '2026-09-25');

    // Verify enriched financials reflect modification profit:
    // Base profit: 15000 - 12000 = 3000
    // Modification profit: 1200 - 800 = 400
    // Base netProfit: 3000 (modification profit is tracked separately)
    assert.equal(updatedTicket.netProfit, 3000);
    assert.equal(updatedTicket.financials.modificationProfit, 400);
  });

  test('9. Round-trip modification updates return flight number and return dates', async () => {
    const rtTicket = {
      id: 'TK-RT-MOD-1',
      customerId: 'CUST-RT',
      passengerName: 'Ahmed Ali',
      tripType: 'Round Trip',
      flightNumber: 'MS 777',
      returnFlightNumber: 'MS 778',
      origin: 'CAI',
      destination: 'DXB',
      departureDate: new Date('2026-09-01T10:00:00Z'),
      arrivalDate: new Date('2026-09-01T14:00:00Z'),
      returnDepartureDate: new Date('2026-10-15T10:00:00Z'),
      returnArrivalDate: new Date('2026-10-15T14:00:00Z'),
      ticketPrice: 20000,
      costPrice: 16000,
      currency: 'EGP',
      status: 'CONFIRMED'
    };
    mockTickets.set(rtTicket.id, rtTicket);

    const agentUser = { id: 'USR-AGENT-1', name: 'Agent Omar', role: 'AGENT' };

    // Modify return flight from October 15 to September 20
    const result = await TicketService.addModification(rtTicket.id, {
      returnFlightNumber: 'MS 780',
      newReturnDepartureDate: '2026-09-20',
      newReturnArrivalDate: '2026-09-21',
      changeFee: 1500,
      airlineFee: 1000,
      reason: 'Passenger requested earlier return',
      collectedNow: false
    }, agentUser);

    assert.equal(result.ticketId, rtTicket.id);
    const updated = await TicketService.getTicketById(rtTicket.id);
    assert.equal(updated.returnFlightNumber, 'MS 780');
    assert.equal(new Date(updated.returnDepartureDate).toISOString().slice(0, 10), '2026-09-20');
    assert.equal(new Date(updated.returnArrivalDate).toISOString().slice(0, 10), '2026-09-21');
    // Departure date unchanged
    assert.equal(new Date(updated.departureDate).toISOString().slice(0, 10), '2026-09-01');
  });

  test('10. addModification with collectedNow: true creates automatic payment record and returns it in response', async () => {
    const payTicket = {
      id: 'TK-PAY-MOD-1',
      customerId: 'CUST-PAY',
      passengerName: 'Sara Hassan',
      flightNumber: 'SM 101',
      origin: 'HBE',
      destination: 'RUH',
      departureDate: new Date('2026-09-05T08:00:00Z'),
      ticketPrice: 10000,
      costPrice: 8000,
      currency: 'EGP',
      status: 'CONFIRMED'
    };
    mockTickets.set(payTicket.id, payTicket);

    // Initial base ticket payment of 10,000 (fully paid before modification)
    mockPayments.push({
      id: 'PAY-INIT-1',
      ticketId: payTicket.id,
      amount: 10000,
      currency: 'EGP',
      method: 'Cash',
      date: new Date()
    });

    const initialPaymentsCount = mockPayments.length;

    const modResult = await TicketService.addModification(payTicket.id, {
      newDepartureDate: '2026-09-12',
      changeFee: 1800,
      airlineFee: 1200,
      collectedNow: true,
      paymentMethod: 'Credit Card',
      reason: 'Schedule shift'
    }, { id: 'USR-1', name: 'Agent Sara', role: 'AGENT' });

    assert.equal(mockPayments.length, initialPaymentsCount + 1, 'One payment record should be created');
    const autoPayment = mockPayments[mockPayments.length - 1];
    assert.equal(autoPayment.ticketId, payTicket.id);
    assert.equal(autoPayment.amount, 1800);
    assert.equal(autoPayment.method, 'Credit Card');

    // Verify response contains autoPayment
    assert.ok(modResult.autoPayment, 'addModification response must include autoPayment object');
    assert.equal(modResult.autoPayment.id, autoPayment.id);
    assert.equal(modResult.autoPayment.amount, 1800);
    assert.equal(modResult.autoPayment.method, 'Credit Card');

    // Verify subsequent getTicketById shows remaining balance = 0 without needing manual refresh
    const ticketAfter = await TicketService.getTicketById(payTicket.id);
    assert.ok(ticketAfter, 'getTicketById returns updated ticket');
    assert.equal(ticketAfter.financials.totalPaid, 10000, 'Ticket totalPaid remains 10000 for ticket, modification fee is independent');
    assert.equal(ticketAfter.financials.modificationFees, 1800, 'Modification fees recorded as 1800');
    assert.equal(ticketAfter.financials.remaining, 0, 'Remaining balance is 0 without requiring manual refresh');
    assert.equal(ticketAfter.financials.paymentStatus, 'CONFIRMED', 'Payment status remains CONFIRMED');
  });

  test('11. addRefundSchema & validateRefund enforce non-negative airlineRefundAmount and cost bounds', () => {
    const validRefundPayload = {
      amount: 5000,
      airlineRefundAmount: 4000,
      costPrice: 6000,
      reason: 'Flight cancelled by passenger'
    };
    const parsed = addRefundSchema.safeParse(validRefundPayload);
    assert.equal(parsed.success, true);
    assert.equal(parsed.data.airlineRefundAmount, 4000);

    const negativeAirRefund = {
      amount: 5000,
      airlineRefundAmount: -500,
      reason: 'Invalid'
    };
    assert.equal(addRefundSchema.safeParse(negativeAirRefund).success, false);

    // validateRefund checks cost price bounds
    const ticketWithCost = {
      id: 'TK-REF-1',
      costPrice: 6000,
      payments: [{ amount: 8000 }],
      refunds: []
    };

    assert.throws(() => {
      validateRefund(ticketWithCost, {
        amount: 5000,
        airlineRefundAmount: 7000, // exceeds costPrice 6000
        reason: 'Over-refunded'
      });
    }, /cannot exceed ticket cost price/);
  });

  test('12. calculateRefundedNetProfit computes retained customer amount minus airline penalty', () => {
    // Ticket Price: 10,000, Cost: 8,000 (Original Profit = 2,000)
    // Customer paid 10,000. Customer refunded 7,000 (Deducted from customer: 3,000)
    // Airline refunded 6,000 to agency (Airline penalty fee: 8,000 - 6,000 = 2,000)
    // Net Agency Profit: 3,000 - 2,000 = 1,000
    const netProfit = calculateRefundedNetProfit(10000, 7000, 8000, 6000);
    assert.equal(netProfit, 1000);

    // If airline refunded full cost (0 penalty) and customer paid 10,000 and refunded 8,000 (kept 2,000 markup):
    const fullAirRefund = calculateRefundedNetProfit(10000, 8000, 8000, 8000);
    assert.equal(fullAirRefund, 2000);
  });

  test('13. TicketService.addRefund updates status to REFUNDED and calculates net profit on refunded ticket', async () => {
    const refundTicket = {
      id: 'TK-REF-E2E-1',
      customerId: 'CUST-REF-1',
      passengerName: 'Mona Zaki',
      flightNumber: 'MS 800',
      origin: 'CAI',
      destination: 'LHR',
      departureDate: new Date('2026-10-01T10:00:00Z'),
      ticketPrice: 12000,
      costPrice: 9000,
      currency: 'EGP',
      status: 'CONFIRMED'
    };
    mockTickets.set(refundTicket.id, refundTicket);
    mockPayments.push({ ticketId: refundTicket.id, amount: 12000 });

    const adminUser = { id: 'USR-ADMIN', name: 'Admin', role: 'ADMIN' };

    // Process refund: Customer gets 9,000 (3,000 kept by agency), Airline returns 7,500 (1,500 penalty)
    const refundResult = await TicketService.addRefund(refundTicket.id, {
      amount: 9000,
      airlineRefundAmount: 7500,
      isCompletedCancellation: true,
      reason: 'Passenger requested cancellation'
    }, adminUser);

    assert.equal(refundResult.ticketId, refundTicket.id);
    assert.equal(refundResult.amount, 9000);
    assert.equal(refundResult.airlineRefundAmount, 7500);

    const updated = await TicketService.getTicketById(refundTicket.id);
    assert.equal(updated.status, 'REFUNDED');
    // Financials check:
    // Retained from customer: 12,000 - 9,000 = 3,000
    // Airline penalty: 9,000 - 7,500 = 1,500
    // Net profit = 3,000 - 1,500 = 1,500
    assert.equal(updated.netProfit, 1500);
    assert.equal(updated.financials.airlinePenalty, 1500);
    assert.equal(updated.financials.customerDeduction, 3000);

    // Role sanitization: Non-admin should not see airlineRefundAmount
    const agentView = sanitizeTicketForRole(updated, 'AGENT');
    assert.equal(agentView.refunds[0].airlineRefundAmount, undefined);
  });
});

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
import { addModificationSchema } from '../server/src/schemas/modification.schema.js';
import {
  calculateTotalModificationFees,
  calculateTotalModificationProfit,
  calculateNetProfit
} from '../server/src/domain/ticket-rules.js';
import { validateModification } from '../server/src/domain/modification-rules.js';
import { enrichTicketFinancials, TicketService } from '../server/src/services/ticket.service.js';
import { sanitizeTicketForRole } from '../server/src/controllers/ticket.controller.js';
import { setPrismaClient, getPrismaClient } from '../server/src/config/database.js';

describe('Flight Modification Fee Split & Date-Only Input Tests', () => {
  const originalPrisma = getPrismaClient();

  const mockTickets = new Map();
  const mockModifications = [];
  const mockAuditLogs = [];

  before(() => {
    const mockPrisma = {
      ticket: {
        findUnique: async ({ where, include }) => {
          const t = mockTickets.get(where.id);
          if (!t) return null;
          const mods = mockModifications.filter(m => m.ticketId === t.id);
          return {
            ...t,
            payments: [],
            refunds: [],
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
          return {
            ...t,
            payments: [],
            refunds: [],
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

  test('5. enrichTicketFinancials adds modification profit to netProfit', () => {
    // Ticket: selling 10000, cost 8000 => base netProfit = 2000
    // Modification: changeFee 1200, airlineFee 800 => modificationProfit = 400
    // Total netProfit must be 2400
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
    assert.equal(enriched.netProfit, 2400, 'netProfit should be base profit (2000) + modification profit (400) = 2400');
    assert.equal(enriched.financials.modificationFees, 1200);
    assert.equal(enriched.financials.modificationProfit, 400);
    assert.equal(enriched.financials.netProfit, 2400);
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
    // Total netProfit: 3400
    assert.equal(updatedTicket.netProfit, 3400);
    assert.equal(updatedTicket.financials.modificationProfit, 400);
  });
});

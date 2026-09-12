/**
 * Verification tests for Ticket Schema Nullable Handling
 * 
 * Verifies that createTicketSchema and updateTicketSchema accept explicit `null`
 * for optional string fields and normalize them to undefined, preventing
 * "Invalid input: expected string, received null" errors.
 */

import assert from 'node:assert/strict';
import { test, describe, before, after } from 'node:test';
import { createTicketSchema, updateTicketSchema } from '../server/src/schemas/ticket.schema.js';
import { TicketService } from '../server/src/services/ticket.service.js';
import { setPrismaClient, getPrismaClient } from '../server/src/config/database.js';

describe('Ticket Schema Nullable Handling Tests', () => {

  const mockTickets = new Map();
  const mockPayments = new Map();
  const mockCustomers = new Map();
  const mockAuditLogs = [];
  let originalPrisma;

  before(() => {
    originalPrisma = getPrismaClient();

    const mockPrisma = {
      ticket: {
        findFirst: async ({ where }) => {
          const queryId = where?.id || where?.ticketNumber || where?.pnr || (where?.OR && (where.OR[0]?.id || where.OR[1]?.ticketNumber || where.OR[2]?.pnr));
          const t = [...mockTickets.values()].find(item =>
            (!queryId || item.id === queryId || item.ticketNumber === queryId || item.pnr === queryId)
          );
          if (!t) return null;
          const payments = [...mockPayments.values()].filter(p => p.ticketId === t.id);
          return { ...t, payments, refunds: [], modifications: [], customer: null };
        },
        create: async ({ data }) => {
          const { payments: paymentCreate, ...ticketData } = data;
          const newTicket = { ...ticketData, createdAt: new Date(), updatedAt: new Date() };
          mockTickets.set(newTicket.id, newTicket);

          const payments = [];
          if (paymentCreate?.create) {
            const pData = { ...paymentCreate.create, ticketId: newTicket.id, createdAt: new Date() };
            mockPayments.set(pData.id, pData);
            payments.push(pData);
          }

          return { ...newTicket, payments, refunds: [], modifications: [], customer: null };
        }
      },
      customer: {
        findFirst: async () => null,
        findUnique: async ({ where }) => mockCustomers.get(where.id) || null,
        create: async ({ data }) => {
          mockCustomers.set(data.id, { ...data });
          return { ...data };
        }
      },
      payment: {
        create: async ({ data }) => {
          mockPayments.set(data.id, { ...data });
          return { ...data };
        }
      },
      auditLog: {
        create: async ({ data }) => {
          mockAuditLogs.push(data);
          return data;
        }
      },
      $transaction: async (fn) => fn(mockPrisma)
    };

    setPrismaClient(mockPrisma);
  });

  after(() => {
    setPrismaClient(originalPrisma);
  });

  test('1. createTicketSchema accepts explicit null for all optional string fields', () => {
    const payloadWithNulls = {
      customerId: null,
      passengerName: 'Ahmed Mahmoud',
      pnr: null,
      ticketNumber: null,
      phone: null,
      passport: null,
      nationality: null,
      dob: null,
      email: null,
      returnFlightNumber: null,
      originTerminal: null,
      originAirportName: null,
      destinationTerminal: null,
      destinationAirportName: null,
      departureDate: null,
      arrivalDate: null,
      returnDepartureDate: null,
      returnArrivalDate: null,
      flightDuration: null,
      seat: null,
      baggage: null,
      paymentMethod: null,
      paymentReference: null,
      paymentDate: null
    };

    const parsed = createTicketSchema.parse(payloadWithNulls);

    assert.equal(parsed.passengerName, 'Ahmed Mahmoud');
    assert.equal(parsed.customerId, undefined);
    assert.equal(parsed.pnr, undefined);
    assert.equal(parsed.phone, undefined);
    assert.equal(parsed.passport, undefined);
    assert.equal(parsed.nationality, undefined);
    assert.equal(parsed.dob, undefined);
    assert.equal(parsed.email, undefined);
    assert.equal(parsed.returnFlightNumber, undefined);
    assert.equal(parsed.originTerminal, undefined);
    assert.equal(parsed.originAirportName, undefined);
    assert.equal(parsed.destinationTerminal, undefined);
    assert.equal(parsed.destinationAirportName, undefined);
    assert.equal(parsed.departureDate, undefined);
    assert.equal(parsed.arrivalDate, undefined);
    assert.equal(parsed.returnDepartureDate, undefined);
    assert.equal(parsed.returnArrivalDate, undefined);
    assert.equal(parsed.flightDuration, undefined);
    assert.equal(parsed.seat, undefined);
    assert.equal(parsed.baggage, undefined);
    assert.equal(parsed.paymentMethod, undefined);
    assert.equal(parsed.paymentReference, undefined);
    assert.equal(parsed.paymentDate, undefined);
  });

  test('2. createTicketSchema succeeds on round-trip ticket with null return-leg optional fields', () => {
    const roundTripPayload = {
      passengerName: 'Mona Youssef',
      airline: 'EgyptAir',
      airlineCode: 'MS',
      flightNumber: 'MS 800',
      origin: 'CAI',
      destination: 'DXB',
      departureDate: '2026-10-01T10:00:00.000Z',
      returnDepartureDate: '2026-10-15T18:00:00.000Z',
      tripType: 'Round Trip',
      ticketPrice: 12000,
      // Optional return-leg fields sent as null by UI
      returnFlightNumber: null,
      returnArrivalDate: null,
      arrivalDate: null,
      originTerminal: null,
      destinationTerminal: null,
      seat: null,
      baggage: null
    };

    const parsed = createTicketSchema.parse(roundTripPayload);
    assert.equal(parsed.passengerName, 'Mona Youssef');
    assert.equal(parsed.tripType, 'Round Trip');
    assert.equal(parsed.returnFlightNumber, undefined);
    assert.equal(parsed.returnArrivalDate, undefined);
    assert.equal(parsed.departureDate, '2026-10-01T10:00:00.000Z');
    assert.equal(parsed.returnDepartureDate, '2026-10-15T18:00:00.000Z');
  });

  test('3. createTicketSchema succeeds on ticket with initial payment and null paymentReference/Method/Date', () => {
    const paymentPayload = {
      passengerName: 'Tarek Zaki',
      ticketPrice: 8500,
      initialPayment: 3000,
      paymentMethod: null,
      paymentReference: null,
      paymentDate: null,
      pnr: null,
      phone: null,
      passport: null
    };

    const parsed = createTicketSchema.parse(paymentPayload);
    assert.equal(parsed.passengerName, 'Tarek Zaki');
    assert.equal(parsed.ticketPrice, 8500);
    assert.equal(parsed.initialPayment, 3000);
    assert.equal(parsed.paymentMethod, undefined);
    assert.equal(parsed.paymentReference, undefined);
    assert.equal(parsed.paymentDate, undefined);
  });

  test('4. updateTicketSchema accepts explicit null for optional fields', () => {
    const updatePayloadWithNulls = {
      phone: null,
      passport: null,
      nationality: null,
      dob: null,
      email: null,
      airline: null,
      airlineCode: null,
      flightNumber: null,
      returnFlightNumber: null,
      origin: null,
      originTerminal: null,
      originAirportName: null,
      destination: null,
      destinationTerminal: null,
      destinationAirportName: null,
      flightDuration: null,
      seat: null,
      baggage: null,
      departureDate: null,
      arrivalDate: null,
      returnDepartureDate: null,
      returnArrivalDate: null,
      ticketNumber: null
    };

    const parsed = updateTicketSchema.parse(updatePayloadWithNulls);
    assert.equal(parsed.phone, undefined);
    assert.equal(parsed.passport, undefined);
    assert.equal(parsed.nationality, undefined);
    assert.equal(parsed.dob, undefined);
    assert.equal(parsed.email, undefined);
    assert.equal(parsed.airline, undefined);
    assert.equal(parsed.flightNumber, undefined);
    assert.equal(parsed.returnFlightNumber, undefined);
    assert.equal(parsed.origin, undefined);
    assert.equal(parsed.destination, undefined);
    assert.equal(parsed.seat, undefined);
    assert.equal(parsed.baggage, undefined);
    assert.equal(parsed.departureDate, null);
    assert.equal(parsed.ticketNumber, null);
  });

  test('5. Validations still strictly enforce max lengths and invalid email', () => {
    assert.throws(() => {
      createTicketSchema.parse({
        pnr: '1234567890123' // > 10 chars
      });
    }, /too_big/);

    assert.throws(() => {
      createTicketSchema.parse({
        email: 'not-a-valid-email'
      });
    }, /Invalid passenger email format/);

    assert.throws(() => {
      createTicketSchema.parse({
        phone: '12345678901234567890123456789012345' // > 30 chars
      });
    }, /too_big/);

    assert.throws(() => {
      createTicketSchema.parse({
        departureDate: '2026-10-15T10:00:00.000Z',
        returnDepartureDate: '2026-10-01T10:00:00.000Z' // return before departure
      });
    }, /Return departure date must be after the outbound departure date/);
  });

  test('6. End-to-end TicketService.createTicket handles round-trip and initial payment with null fields', async () => {
    const adminUser = { id: 'admin-test-nullables', name: 'Test Admin', role: 'ADMIN' };

    // 1. Create round-trip ticket with null optional fields
    const rtTicket = await TicketService.createTicket({
      passengerName: 'Integration Test RT',
      airline: 'Saudia',
      airlineCode: 'SV',
      flightNumber: 'SV 300',
      origin: 'CAI',
      destination: 'JED',
      tripType: 'Round Trip',
      ticketPrice: 9000,
      departureDate: '2026-11-01T08:00:00.000Z',
      returnDepartureDate: '2026-11-10T14:00:00.000Z',
      returnFlightNumber: null,
      returnArrivalDate: null,
      originTerminal: null,
      destinationTerminal: null,
      seat: null,
      baggage: null,
      phone: null,
      passport: null
    }, adminUser);

    assert.ok(rtTicket.id);
    assert.equal(rtTicket.passengerName, 'Integration Test RT');
    assert.equal(rtTicket.returnFlightNumber, null);
    assert.equal(rtTicket.tripType, 'Round Trip');

    // Retrieve via getTicketById
    const fetchedRt = await TicketService.getTicketById(rtTicket.id);
    assert.equal(fetchedRt.id, rtTicket.id);
    assert.equal(fetchedRt.passengerName, 'Integration Test RT');

    // 2. Create ticket with initial payment and null paymentReference / paymentMethod / paymentDate
    const paidTicket = await TicketService.createTicket({
      passengerName: 'Integration Test InitialPay',
      airline: 'EgyptAir',
      flightNumber: 'MS 777',
      origin: 'CAI',
      destination: 'LHR',
      ticketPrice: 15000,
      initialPayment: 5000,
      paymentMethod: null,
      paymentReference: null,
      paymentDate: null,
      phone: null,
      passport: null
    }, adminUser);

    assert.ok(paidTicket.id);
    assert.equal(paidTicket.financials.totalPaid, 5000);
    assert.equal(paidTicket.payments.length, 1);
    assert.equal(paidTicket.payments[0].amount, 5000);
    // Defaults kicked in smoothly in ticket.service
    assert.equal(paidTicket.payments[0].method, 'Credit Card');
    assert.ok(paidTicket.payments[0].reference.startsWith('INIT-'));

    // Retrieve via getTicketById
    const fetchedPaid = await TicketService.getTicketById(paidTicket.id);
    assert.equal(fetchedPaid.id, paidTicket.id);
    assert.equal(fetchedPaid.financials.totalPaid, 5000);
  });

});

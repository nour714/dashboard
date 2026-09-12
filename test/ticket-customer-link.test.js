/**
 * AfricaTravel - Ticket & Customer Find-or-Create Regression Test Suite
 */

import { TicketService } from '../server/src/services/ticket.service.js';
import { AuditService } from '../server/src/services/audit.service.js';
import * as dbModule from '../server/src/config/database.js';

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

async function runTicketCustomerTests() {
  console.log('\n🎫 ========================================================');
  console.log('   Ticket-Customer Association (Find-or-Create) Tests');
  console.log('========================================================\n');

  // In-memory mock database state
  const mockCustomers = [];
  const mockTickets = [];
  const mockAuditLogs = [];

  const mockPrisma = {
    customer: {
      findFirst: async ({ where }) => {
        // Support both direct string and Prisma case-insensitive object filter
        const passportFilter = where?.passport;
        if (passportFilter) {
          const passportValue = typeof passportFilter === 'object' && passportFilter.equals
            ? passportFilter.equals
            : passportFilter;
          return mockCustomers.find(c =>
            c.passport && c.passport.toLowerCase() === String(passportValue).toLowerCase() && !c.deletedAt
          ) || null;
        }
        return mockCustomers[0] || null;
      },
      create: async ({ data }) => {
        const record = { ...data, createdAt: new Date(), updatedAt: new Date() };
        mockCustomers.push(record);
        return record;
      }
    },
    ticket: {
      findFirst: async ({ where }) => {
        if (where?.id) {
          return mockTickets.find(t => t.id === where.id && (where.deletedAt === undefined || (where.deletedAt === null ? !t.deletedAt : !!t.deletedAt))) || null;
        }
        if (where?.ticketNumber) {
          return mockTickets.find(t => t.ticketNumber === where.ticketNumber && (where.deletedAt === undefined || (where.deletedAt === null ? !t.deletedAt : !!t.deletedAt))) || null;
        }
        if (where?.pnr) {
          return mockTickets.find(t => t.pnr === where.pnr && (where.deletedAt === undefined || (where.deletedAt === null ? !t.deletedAt : !!t.deletedAt))) || null;
        }
        if (where?.OR) {
          return mockTickets.find(t => !t.deletedAt && where.OR.some(c => (c.id && t.id === c.id) || (c.ticketNumber && t.ticketNumber === c.ticketNumber) || (c.pnr && t.pnr === c.pnr))) || null;
        }
        return mockTickets[0] || null;
      },
      create: async ({ data }) => {
        // Enforce DB partial unique index simulation (active tickets only)
        if (data.pnr) {
          const duplicatePnr = mockTickets.find(t => t.pnr === data.pnr && !t.deletedAt);
          if (duplicatePnr) {
            const err = new Error('Unique constraint failed on the fields: (`pnr`)');
            err.code = 'P2002';
            err.meta = { target: ['pnr'] };
            throw err;
          }
        }
        if (data.ticketNumber) {
          const duplicateTicketNumber = mockTickets.find(t => t.ticketNumber === data.ticketNumber && !t.deletedAt);
          if (duplicateTicketNumber) {
            const err = new Error('Unique constraint failed on the fields: (`ticketNumber`)');
            err.code = 'P2002';
            err.meta = { target: ['ticketNumber'] };
            throw err;
          }
        }
        const record = {
          ...data,
          createdAt: new Date(),
          updatedAt: new Date(),
          payments: [],
          modifications: [],
          refunds: []
        };
        mockTickets.push(record);
        return record;
      },
      delete: async ({ where }) => {
        const idx = mockTickets.findIndex(t => t.id === where.id);
        if (idx !== -1) {
          return mockTickets.splice(idx, 1)[0];
        }
        return null;
      },
      update: async ({ where, data }) => {
        const t = mockTickets.find(t => t.id === where.id);
        if (t) {
          Object.assign(t, data, { updatedAt: new Date() });
          return t;
        }
        return null;
      }
    },
    $transaction: async (fn) => {
      if (typeof fn === 'function') {
        return await fn(mockPrisma);
      }
      return fn;
    },
    auditLog: {
      create: async ({ data }) => {
        mockAuditLogs.push(data);
        return data;
      }
    }
  };

  // Inject mockPrisma
  dbModule.setPrismaClient(mockPrisma);

  // Intercept AuditService.recordLog
  const originalRecordLog = AuditService.recordLog;
  const recordedLogs = [];
  AuditService.recordLog = async (logData) => {
    recordedLogs.push(logData);
    return logData;
  };

  try {
    // 1. Create ticket with a brand new passport
    console.log('--- 1. New Passenger with Unique Passport ---');
    const ticketData1 = {
      passengerName: 'Kareem Fahmy',
      passport: 'A12345678',
      phone: '+201001234567',
      email: 'kareem@example.com',
      nationality: 'Egyptian (EGY)',
      origin: 'CAI',
      destination: 'JED',
      airline: 'Saudia',
      departureDate: '2026-09-01T10:00:00Z',
      arrivalDate: '2026-09-01T13:30:00Z',
      ticketPrice: 8500
    };

    const ticket1 = await TicketService.createTicket(ticketData1, { name: 'Agent Sarah', id: 'USR-01' });

    assert(mockCustomers.length === 1, 'Created exactly 1 customer in DB');
    const createdCust1 = mockCustomers[0];
    assert(createdCust1.name === 'Kareem Fahmy', 'Customer name matches passengerName');
    assert(createdCust1.passport === 'A12345678', 'Customer passport matches data.passport');
    assert(createdCust1.phone === '+201001234567', 'Customer phone matches data.phone');
    assert(createdCust1.email === 'kareem@example.com', 'Customer email matches data.email');
    assert(createdCust1.nationality === 'Egyptian (EGY)', 'Customer nationality matches data.nationality');
    assert(createdCust1.isVip === false, 'Customer isVip defaults to false');
    assert(createdCust1.id.startsWith('CUST-'), `Customer ID generated in CUST-xxxx format (${createdCust1.id})`);
    assert(ticket1.customerId === createdCust1.id, `Ticket customerId (${ticket1.customerId}) points to newly created customer`);
    assert(recordedLogs[recordedLogs.length - 1].customerId === createdCust1.id, 'Audit log records correct customerId');

    // 2. Create another ticket with the EXACT same passport
    console.log('\n--- 2. Existing Passenger with Matching Passport ---');
    const ticketData2 = {
      passengerName: 'Kareem Fahmy',
      passport: ' A12345678 ', // With whitespace to test trimming
      phone: '+201001234567',
      origin: 'JED',
      destination: 'CAI',
      airline: 'Saudia',
      departureDate: '2026-09-10T10:00:00Z',
      arrivalDate: '2026-09-10T13:30:00Z',
      ticketPrice: 9200
    };

    const ticket2 = await TicketService.createTicket(ticketData2, { name: 'Agent Sarah', id: 'USR-01' });

    assert(mockCustomers.length === 1, 'Did NOT create a duplicate customer (count is still 1)');
    assert(ticket2.customerId === createdCust1.id, `Ticket customerId (${ticket2.customerId}) reuses existing customer ID (${createdCust1.id})`);
    assert(recordedLogs[recordedLogs.length - 1].customerId === createdCust1.id, 'Audit log records existing customerId');

    // 3. Create ticket without passport (empty / null)
    console.log('\n--- 3. Passenger Without Passport ---');
    const ticketData3 = {
      passengerName: 'Nour El-Din',
      passport: '',
      phone: '+201112223334',
      origin: 'CAI',
      destination: 'SSH',
      airline: 'EgyptAir',
      departureDate: '2026-09-15T08:00:00Z',
      arrivalDate: '2026-09-15T09:00:00Z',
      ticketPrice: 3200
    };

    const ticket3 = await TicketService.createTicket(ticketData3, { name: 'Agent Omar', id: 'USR-02' });

    assert(mockCustomers.length === 2, 'Created a new customer for passenger without passport (count is now 2)');
    const createdCust2 = mockCustomers[1];
    assert(createdCust2.name === 'Nour El-Din', 'New customer has correct name');
    assert(createdCust2.passport === null, 'New customer passport is null');
    assert(ticket3.customerId === createdCust2.id, `Ticket points to new customer ID (${createdCust2.id})`);

    // 4. Create ticket with explicit customerId provided
    console.log('\n--- 4. Ticket with Explicit customerId ---');
    const ticketData4 = {
      customerId: 'CUST-EXPLICIT-999',
      passengerName: 'VIP Passenger',
      origin: 'CAI',
      destination: 'LHR',
      airline: 'British Airways',
      departureDate: '2026-09-20T10:00:00Z',
      arrivalDate: '2026-09-20T15:00:00Z',
      ticketPrice: 25000
    };

    const ticket4 = await TicketService.createTicket(ticketData4, { name: 'Agent Omar', id: 'USR-02' });

    assert(mockCustomers.length === 2, 'No new customer created when explicit customerId is provided');
    assert(ticket4.customerId === 'CUST-EXPLICIT-999', 'Ticket respects explicitly passed customerId');

    // 5. Verify no 'CUST-8924' hardcoded fallback is ever used
    console.log('\n--- 5. Fallback Hardcoding Verification ---');
    assert(ticket1.customerId !== 'CUST-8924', 'Ticket 1 does not use CUST-8924 fallback');
    assert(ticket2.customerId !== 'CUST-8924', 'Ticket 2 does not use CUST-8924 fallback');
    assert(ticket3.customerId !== 'CUST-8924', 'Ticket 3 does not use CUST-8924 fallback');

    // 6. Optional ticketNumber & No Random Generation Verification
    console.log('\n--- 6. Optional ticketNumber & No Random Generation ---');
    const noTicketNum1 = await TicketService.createTicket({
      passengerName: 'Passenger Without ETicket 1',
      origin: 'CAI',
      destination: 'JED',
      airline: 'Saudia',
      departureDate: '2026-10-01T08:00:00Z',
      ticketPrice: 8000
    }, { name: 'Agent Sarah', id: 'USR-01' });

    assert(noTicketNum1.ticketNumber === null, 'Ticket without ticketNumber stores ticketNumber: null');
    assert(noTicketNum1.ticketNumber !== undefined, 'Ticket ticketNumber is null, not undefined');
    assert(typeof noTicketNum1.ticketNumber !== 'string' || !noTicketNum1.ticketNumber.startsWith('077-'), 'No random 077- ticket number was auto-generated');

    const noTicketNum2 = await TicketService.createTicket({
      passengerName: 'Passenger Without ETicket 2',
      origin: 'CAI',
      destination: 'RUH',
      airline: 'Flynas',
      ticketNumber: '   ',
      departureDate: '2026-10-02T08:00:00Z',
      ticketPrice: 6000
    }, { name: 'Agent Sarah', id: 'USR-01' });

    assert(noTicketNum2.ticketNumber === null, 'Ticket with whitespace-only ticketNumber stores ticketNumber: null');

    const withExplicitTicketNum = await TicketService.createTicket({
      passengerName: 'Passenger With Explicit ETicket',
      origin: 'CAI',
      destination: 'DXB',
      airline: 'Emirates',
      ticketNumber: '176-9876543210',
      departureDate: '2026-10-03T08:00:00Z',
      ticketPrice: 15000
    }, { name: 'Agent Sarah', id: 'USR-01' });

    assert(withExplicitTicketNum.ticketNumber === '176-9876543210', 'Ticket with explicit ticketNumber preserves exact value');

    // 7. PNR Reuse After Deletion & Active Duplicate Blocked
    console.log('\n--- 7. PNR Reuse After Deletion & Active Duplicate Blocked ---');
    const pnrTicket1 = await TicketService.createTicket({
      passengerName: 'Passenger PNR 1',
      pnr: 'PNR-REUSE-777',
      origin: 'CAI',
      destination: 'DXB',
      airline: 'Emirates',
      ticketPrice: 12000
    }, { name: 'Agent Sarah', id: 'USR-01' });

    assert(pnrTicket1.pnr === 'PNR-REUSE-777', 'Initial ticket created with PNR-REUSE-777');

    // Attempting to create duplicate active PNR must fail with 409 DUPLICATE_PNR
    let activeDuplicateFailed = false;
    try {
      await TicketService.createTicket({
        passengerName: 'Passenger PNR 2 (Active Duplicate)',
        pnr: 'PNR-REUSE-777',
        origin: 'CAI',
        destination: 'DXB',
        airline: 'Emirates',
        ticketPrice: 12000
      }, { name: 'Agent Sarah', id: 'USR-01' });
    } catch (err) {
      activeDuplicateFailed = true;
      assert((err.statusCode || err.status) === 409, 'Duplicate active PNR rejected with 409 status');
      assert(err.code === 'DUPLICATE_PNR', 'Duplicate active PNR returns DUPLICATE_PNR error code');
      assert(err.message === 'PNR already exists', 'Duplicate active PNR returns clean "PNR already exists" message');
    }
    assert(activeDuplicateFailed, 'Creating second active ticket with same PNR was blocked');

    // Soft-delete the first ticket (simulate soft-deletion / archive)
    const storedTicket1 = mockTickets.find(t => t.id === pnrTicket1.id);
    storedTicket1.deletedAt = new Date();

    // Creating new ticket with the exact same PNR after soft-delete MUST SUCCEED
    const pnrTicket2 = await TicketService.createTicket({
      passengerName: 'Passenger PNR 3 (Reused After Soft-Delete)',
      pnr: 'PNR-REUSE-777',
      origin: 'CAI',
      destination: 'JED',
      airline: 'Saudia',
      ticketPrice: 9500
    }, { name: 'Agent Sarah', id: 'USR-01' });

    assert(pnrTicket2.pnr === 'PNR-REUSE-777', 'New ticket successfully reused PNR-REUSE-777 after soft-delete');
    assert(pnrTicket2.id !== pnrTicket1.id, 'New ticket has distinct ID');

    // Soft-delete the second ticket via deleteTicket (archive)
    await TicketService.deleteTicket(pnrTicket2.id, { id: 'ADM-01', role: 'ADMIN', name: 'Admin User' });
    const pnrTicket2InDb = mockTickets.find(t => t.id === pnrTicket2.id);
    assert(pnrTicket2InDb && pnrTicket2InDb.deletedAt !== null, 'Second ticket soft-deleted (archived) via deleteTicket');

    // Creating new ticket with the exact same PNR after soft-delete via deleteTicket MUST SUCCEED
    const pnrTicket3 = await TicketService.createTicket({
      passengerName: 'Passenger PNR 4 (Reused After Soft-Delete via deleteTicket)',
      pnr: 'PNR-REUSE-777',
      origin: 'CAI',
      destination: 'RUH',
      airline: 'Flynas',
      ticketPrice: 7500
    }, { name: 'Agent Sarah', id: 'USR-01' });

    assert(pnrTicket3.pnr === 'PNR-REUSE-777', 'New ticket successfully reused PNR-REUSE-777 after soft-delete via deleteTicket');

    // 8. TicketNumber Reuse After Deletion & Active Duplicate Blocked (Zero Regression)
    console.log('\n--- 8. TicketNumber Reuse After Deletion & Active Duplicate Blocked ---');
    const tNumTicket1 = await TicketService.createTicket({
      passengerName: 'Passenger TicketNumber 1',
      ticketNumber: '077-55556666',
      origin: 'CAI',
      destination: 'DOH',
      airline: 'Qatar Airways',
      ticketPrice: 14000
    }, { name: 'Agent Sarah', id: 'USR-01' });

    assert(tNumTicket1.ticketNumber === '077-55556666', 'Initial ticket created with ticketNumber 077-55556666');

    // Attempting to create duplicate active ticketNumber must fail with 409 DUPLICATE_TICKET_NUMBER
    let activeTicketNumFailed = false;
    try {
      await TicketService.createTicket({
        passengerName: 'Passenger TicketNumber 2 (Active Duplicate)',
        ticketNumber: '077-55556666',
        origin: 'CAI',
        destination: 'DOH',
        airline: 'Qatar Airways',
        ticketPrice: 14000
      }, { name: 'Agent Sarah', id: 'USR-01' });
    } catch (err) {
      activeTicketNumFailed = true;
      assert((err.statusCode || err.status) === 409, 'Duplicate active ticketNumber rejected with 409 status');
      assert(err.code === 'DUPLICATE_TICKET_NUMBER', 'Duplicate active ticketNumber returns DUPLICATE_TICKET_NUMBER code');
    }
    assert(activeTicketNumFailed, 'Creating second active ticket with same ticketNumber was blocked');

    // Soft-delete the ticket
    const storedTNumTicket1 = mockTickets.find(t => t.id === tNumTicket1.id);
    storedTNumTicket1.deletedAt = new Date();

    // Reusing ticketNumber after soft-delete MUST SUCCEED
    const tNumTicket2 = await TicketService.createTicket({
      passengerName: 'Passenger TicketNumber 3 (Reused After Soft-Delete)',
      ticketNumber: '077-55556666',
      origin: 'CAI',
      destination: 'KWI',
      airline: 'Kuwait Airways',
      ticketPrice: 11000
    }, { name: 'Agent Sarah', id: 'USR-01' });

    assert(tNumTicket2.ticketNumber === '077-55556666', 'New ticket successfully reused ticketNumber after soft-delete');

    // Soft-delete via deleteTicket (archive)
    await TicketService.deleteTicket(tNumTicket2.id, { id: 'ADM-01', role: 'ADMIN', name: 'Admin User' });
    const tNumTicket2InDb = mockTickets.find(t => t.id === tNumTicket2.id);
    assert(tNumTicket2InDb && tNumTicket2InDb.deletedAt !== null, 'Ticket successfully soft-deleted (archived) via deleteTicket');

    // Reusing ticketNumber after soft-delete via deleteTicket MUST SUCCEED
    const tNumTicket3 = await TicketService.createTicket({
      passengerName: 'Passenger TicketNumber 4 (Reused After Soft-Delete via deleteTicket)',
      ticketNumber: '077-55556666',
      origin: 'CAI',
      destination: 'BAH',
      airline: 'Gulf Air',
      ticketPrice: 10500
    }, { name: 'Agent Sarah', id: 'USR-01' });

    assert(tNumTicket3.ticketNumber === '077-55556666', 'New ticket successfully reused ticketNumber after soft-delete via deleteTicket');

    console.log('\n========================================================');
    console.log(`Ticket Customer Link Tests: ${passed} passed, ${failed} failed`);
    console.log('========================================================\n');
  } finally {
    // Restore
    dbModule.setPrismaClient(null);
    AuditService.recordLog = originalRecordLog;
  }

  if (failures.length > 0) {
    process.exit(1);
  }
}

runTicketCustomerTests();

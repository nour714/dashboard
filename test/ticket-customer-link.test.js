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
        if (where?.passport) {
          return mockCustomers.find(c => c.passport === where.passport) || null;
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
      create: async ({ data }) => {
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
      }
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

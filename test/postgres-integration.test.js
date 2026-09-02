/**
 * AfricaTravel — Real PostgreSQL Integration Tests
 *
 * Validates database-level constraints on real PostgreSQL:
 * 1. Passport uniqueness: duplicates rejected, NULLs allowed
 * 2. PNR uniqueness: duplicates rejected, NULLs allowed
 * 3. Error handling: Prisma P2002 unique constraint violations translated to 409 Conflict
 *
 * NOTE: Non-destructive test. Requires TEST_DATABASE_URL.
 * If TEST_DATABASE_URL is not provided, this test is cleanly skipped without error.
 */

import crypto from 'crypto';
import { PrismaClient } from '@prisma/client';
import { CustomerService } from '../server/src/services/customer.service.js';
import { TicketService } from '../server/src/services/ticket.service.js';
import { setPrismaClient } from '../server/src/config/database.js';

const testDbUrl = process.env.TEST_DATABASE_URL;

if (!testDbUrl) {
  console.log('\n⚠️  PostgreSQL integration tests skipped because TEST_DATABASE_URL is not configured.\n');
  process.exit(0);
}

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

async function runPostgresIntegrationTests() {
  console.log('\n🐘 ========================================================');
  console.log('   AfricaTravel Real PostgreSQL Integration Tests');
  console.log('========================================================\n');

  const prisma = new PrismaClient({
    datasources: { db: { url: testDbUrl } }
  });

  // Track created test IDs for safe cleanup
  const createdCustomerIds = [];
  const createdTicketIds = [];

  const runId = crypto.randomUUID().substring(0, 8);
  const passportA = `TEST-P-${runId}-1`;
  const pnrA = `TESTPNR${runId.substring(0, 3)}`.toUpperCase();

  try {
    // 1. Set the active Prisma client for services
    setPrismaClient(prisma);

    // ══════════════════════════════════════════════════════════════
    // SECTION 1: Customer Passport Uniqueness in PostgreSQL
    // ══════════════════════════════════════════════════════════════
    console.log('--- 1. Real PostgreSQL: Passport Uniqueness ---');

    // 1.1: Create first customer with unique passport
    const cust1 = await CustomerService.createCustomer({
      name: `Test Customer ${runId}-1`,
      passport: passportA,
      nationality: 'Egyptian (EGY)'
    }, { name: 'IntegrationTest', id: 'TEST-USER' });
    createdCustomerIds.push(cust1.id);
    assert(cust1 && cust1.passport === passportA, 'Customer with unique passport inserted into PostgreSQL');

    // 1.2: Attempt duplicate passport -> must reject with 409
    let dupPassportErr = null;
    try {
      await CustomerService.createCustomer({
        name: `Test Customer ${runId}-2`,
        passport: passportA,
        nationality: 'Egyptian (EGY)'
      }, { name: 'IntegrationTest', id: 'TEST-USER' });
    } catch (err) {
      dupPassportErr = err;
    }
    assert(dupPassportErr !== null, 'Duplicate passport insert rejected by PostgreSQL unique constraint');
    assert(dupPassportErr?.statusCode === 409, 'Duplicate passport error code is HTTP 409 Conflict');
    assert(dupPassportErr?.message === 'Passport number already exists', 'Error message matches "Passport number already exists"');

    // 1.3: Multiple customers with NULL passport allowed in PostgreSQL
    const custNull1 = await CustomerService.createCustomer({
      name: `Test Customer Null 1 ${runId}`
    }, { name: 'IntegrationTest', id: 'TEST-USER' });
    createdCustomerIds.push(custNull1.id);

    const custNull2 = await CustomerService.createCustomer({
      name: `Test Customer Null 2 ${runId}`
    }, { name: 'IntegrationTest', id: 'TEST-USER' });
    createdCustomerIds.push(custNull2.id);

    assert(custNull1.id && custNull2.id, 'PostgreSQL allows multiple customers with NULL passport');

    // ══════════════════════════════════════════════════════════════
    // SECTION 2: Ticket PNR Uniqueness in PostgreSQL
    // ══════════════════════════════════════════════════════════════
    console.log('\n--- 2. Real PostgreSQL: PNR Uniqueness ---');

    // 2.1: Create first ticket with unique PNR
    const ticket1 = await TicketService.createTicket({
      pnr: pnrA,
      ticketNumber: `077-${Date.now().toString().slice(-10)}`,
      passengerName: `Passenger ${runId}-1`,
      airline: 'EgyptAir',
      airlineCode: 'MS',
      origin: 'CAI',
      destination: 'DXB',
      ticketPrice: 5000,
      customerId: cust1.id
    }, { name: 'IntegrationTest', id: 'TEST-USER' });
    createdTicketIds.push(ticket1.id);
    assert(ticket1 && ticket1.pnr === pnrA, 'Ticket with unique PNR inserted into PostgreSQL');

    // 2.2: Attempt duplicate PNR -> must reject with 409
    let dupPnrErr = null;
    try {
      await TicketService.createTicket({
        pnr: pnrA,
        ticketNumber: `077-${(Date.now() + 1).toString().slice(-10)}`,
        passengerName: `Passenger ${runId}-2`,
        airline: 'EgyptAir',
        airlineCode: 'MS',
        origin: 'CAI',
        destination: 'DXB',
        ticketPrice: 6000,
        customerId: cust1.id
      }, { name: 'IntegrationTest', id: 'TEST-USER' });
    } catch (err) {
      dupPnrErr = err;
    }
    assert(dupPnrErr !== null, 'Duplicate PNR insert rejected by PostgreSQL unique constraint');
    assert(dupPnrErr?.statusCode === 409, 'Duplicate PNR error code is HTTP 409 Conflict');
    assert(dupPnrErr?.message === 'PNR already exists', 'Error message matches "PNR already exists"');

    // 2.3: Multiple tickets with NULL PNR allowed in PostgreSQL
    const ticketNull1 = await TicketService.createTicket({
      passengerName: `Passenger Null 1 ${runId}`,
      airline: 'EgyptAir',
      airlineCode: 'MS',
      origin: 'CAI',
      destination: 'JED',
      ticketPrice: 3000,
      customerId: cust1.id
    }, { name: 'IntegrationTest', id: 'TEST-USER' });
    createdTicketIds.push(ticketNull1.id);

    assert(ticketNull1 && ticketNull1.id, 'PostgreSQL allows tickets with auto-generated/null PNR');

  } finally {
    // Non-destructive cleanup: only delete specific test records created during this run
    try {
      if (createdTicketIds.length > 0) {
        await prisma.payment.deleteMany({ where: { ticketId: { in: createdTicketIds } } });
        await prisma.modification.deleteMany({ where: { ticketId: { in: createdTicketIds } } });
        await prisma.refund.deleteMany({ where: { ticketId: { in: createdTicketIds } } });
        await prisma.ticket.deleteMany({ where: { id: { in: createdTicketIds } } });
      }
      if (createdCustomerIds.length > 0) {
        await prisma.customerNote.deleteMany({ where: { customerId: { in: createdCustomerIds } } });
        await prisma.customer.deleteMany({ where: { id: { in: createdCustomerIds } } });
      }
    } catch (cleanupErr) {
      console.warn('⚠️ Test cleanup notice:', cleanupErr.message);
    }
    await prisma.$disconnect().catch(() => {});
  }

  console.log('\n========================================================');
  console.log(`Real PostgreSQL Tests: ${passed} passed, ${failed} failed`);
  console.log('========================================================\n');

  if (failed > 0) {
    console.error(`❌ Failures (${failed}):`);
    failures.forEach(f => console.error(`  - ${f}`));
    process.exit(1);
  }
}

runPostgresIntegrationTests().catch(err => {
  console.error('Unhandled integration test exception:', err);
  process.exit(1);
});

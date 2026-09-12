/**
 * AfricaTravel - Verification Tests for P1-2 Zod Schema Bounds
 */

import { queryTicketsSchema, createTicketSchema, updateTicketSchema } from '../server/src/schemas/ticket.schema.js';
import { queryCustomersSchema, createCustomerSchema, updateCustomerSchema } from '../server/src/schemas/customer.schema.js';
import { queryLogsSchema } from '../server/src/schemas/audit.schema.js';
import { queryExpensesSchema, createExpenseSchema } from '../server/src/schemas/expense.schema.js';

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

async function runSchemaBoundsTests() {
  console.log('\n📏 ========================================================');
  console.log('   AfricaTravel P1-2 Schema Bounds Verification');
  console.log('========================================================\n');

  // 1. Ticket search & field bounds
  console.log('--- 1. Ticket Schema Bounds ---');
  const validTicketQuery = queryTicketsSchema.safeParse({ search: 'A'.repeat(100) });
  assert(validTicketQuery.success, 'queryTicketsSchema accepts search query of 100 chars');

  const tooLongTicketQuery = queryTicketsSchema.safeParse({ search: 'A'.repeat(101) });
  assert(!tooLongTicketQuery.success, 'queryTicketsSchema rejects search query > 100 chars');

  const validTicket = createTicketSchema.safeParse({
    passengerName: 'A'.repeat(150),
    phone: '0'.repeat(30),
    passport: 'P'.repeat(30),
    ticketNumber: 'T'.repeat(50)
  });
  assert(validTicket.success, 'createTicketSchema accepts boundary lengths (150 name, 30 phone, 30 passport, 50 ticketNumber)');

  const longTicketName = createTicketSchema.safeParse({ passengerName: 'A'.repeat(151) });
  assert(!longTicketName.success, 'createTicketSchema rejects passengerName > 150 chars');

  const longTicketPhone = createTicketSchema.safeParse({ phone: '0'.repeat(31) });
  assert(!longTicketPhone.success, 'createTicketSchema rejects phone > 30 chars');

  const longTicketPassport = createTicketSchema.safeParse({ passport: 'P'.repeat(31) });
  assert(!longTicketPassport.success, 'createTicketSchema rejects passport > 30 chars');

  const longTicketNum = createTicketSchema.safeParse({ ticketNumber: 'T'.repeat(51) });
  assert(!longTicketNum.success, 'createTicketSchema rejects ticketNumber > 50 chars');

  // 2. Customer search & field bounds
  console.log('\n--- 2. Customer Schema Bounds ---');
  const validCustSearch = queryCustomersSchema.safeParse({ search: 'C'.repeat(100), q: 'Q'.repeat(100) });
  assert(validCustSearch.success, 'queryCustomersSchema accepts search and q of 100 chars');

  const longCustSearch = queryCustomersSchema.safeParse({ search: 'C'.repeat(101) });
  assert(!longCustSearch.success, 'queryCustomersSchema rejects search > 100 chars');

  const longCustQ = queryCustomersSchema.safeParse({ q: 'Q'.repeat(101) });
  assert(!longCustQ.success, 'queryCustomersSchema rejects q > 100 chars');

  const validCustomer = createCustomerSchema.safeParse({
    name: 'C'.repeat(150),
    phone: '0'.repeat(30),
    passport: 'P'.repeat(30)
  });
  assert(validCustomer.success, 'createCustomerSchema accepts boundary lengths (150 name, 30 phone, 30 passport)');

  const longCustName = createCustomerSchema.safeParse({ name: 'C'.repeat(151) });
  assert(!longCustName.success, 'createCustomerSchema rejects name > 150 chars');

  const longCustPhone = createCustomerSchema.safeParse({ name: 'Valid Name', phone: '0'.repeat(31) });
  assert(!longCustPhone.success, 'createCustomerSchema rejects phone > 30 chars');

  const longCustPassport = createCustomerSchema.safeParse({ name: 'Valid Name', passport: 'P'.repeat(31) });
  assert(!longCustPassport.success, 'createCustomerSchema rejects passport > 30 chars');

  // 3. Audit and Expense bounds
  console.log('\n--- 3. Audit & Expense Bounds ---');
  const validAuditQuery = queryLogsSchema.safeParse({ user: 'U'.repeat(100), action: 'A'.repeat(100) });
  assert(validAuditQuery.success, 'queryLogsSchema accepts user and action of 100 chars');

  const longAuditUser = queryLogsSchema.safeParse({ user: 'U'.repeat(101) });
  assert(!longAuditUser.success, 'queryLogsSchema rejects user > 100 chars');

  const longExpenseDesc = createExpenseSchema.safeParse({
    category: 'SERVICES',
    amount: 100,
    description: 'D'.repeat(501),
    date: '2026-09-12'
  });
  assert(!longExpenseDesc.success, 'createExpenseSchema rejects description > 500 chars');

  console.log('\n========================================================');
  console.log(`Schema Bounds Verification: ${passed} passed, ${failed} failed`);
  console.log('========================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runSchemaBoundsTests();

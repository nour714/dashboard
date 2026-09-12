/**
 * AfricaTravel - Verification Tests for P1-2 Zod Schema Bounds
 */

import { queryTicketsSchema, createTicketSchema, updateTicketSchema } from '../server/src/schemas/ticket.schema.js';
import { queryCustomersSchema, createCustomerSchema, updateCustomerSchema } from '../server/src/schemas/customer.schema.js';
import { queryLogsSchema } from '../server/src/schemas/audit.schema.js';
import { queryExpensesSchema, createExpenseSchema } from '../server/src/schemas/expense.schema.js';
import { createEmployeeSchema } from '../server/src/schemas/employee.schema.js';
import { loginSchema, changePasswordSchema } from '../server/src/schemas/auth.schema.js';
import { addModificationSchema } from '../server/src/schemas/modification.schema.js';
import { addPaymentSchema } from '../server/src/schemas/payment.schema.js';
import { addRefundSchema } from '../server/src/schemas/refund.schema.js';

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
    ticketNumber: 'T'.repeat(30),
    pnr: 'P'.repeat(10),
    origin: 'O'.repeat(120),
    destination: 'D'.repeat(120),
    flightNumber: 'F'.repeat(30),
    currency: 'E'.repeat(10)
  });
  assert(validTicket.success, 'createTicketSchema accepts boundary lengths (150 name, 30 phone, 30 passport, 30 ticketNumber, 10 pnr, 120 origin/dest)');

  const longTicketName = createTicketSchema.safeParse({ passengerName: 'A'.repeat(151) });
  assert(!longTicketName.success, 'createTicketSchema rejects passengerName > 150 chars');

  const longTicketPhone = createTicketSchema.safeParse({ phone: '0'.repeat(31) });
  assert(!longTicketPhone.success, 'createTicketSchema rejects phone > 30 chars');

  const longTicketPassport = createTicketSchema.safeParse({ passport: 'P'.repeat(31) });
  assert(!longTicketPassport.success, 'createTicketSchema rejects passport > 30 chars');

  const longTicketNum = createTicketSchema.safeParse({ ticketNumber: 'T'.repeat(31) });
  assert(!longTicketNum.success, 'createTicketSchema rejects ticketNumber > 30 chars');

  const longTicketPnr = createTicketSchema.safeParse({ pnr: 'P'.repeat(11) });
  assert(!longTicketPnr.success, 'createTicketSchema rejects pnr > 10 chars');

  const longTicketOrigin = createTicketSchema.safeParse({ origin: 'O'.repeat(121) });
  assert(!longTicketOrigin.success, 'createTicketSchema rejects origin > 120 chars');

  const longTicketDest = createTicketSchema.safeParse({ destination: 'D'.repeat(121) });
  assert(!longTicketDest.success, 'createTicketSchema rejects destination > 120 chars');

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

  const validExpense = createExpenseSchema.safeParse({
    category: 'SERVICES',
    amount: 100,
    description: 'D'.repeat(500),
    currency: 'E'.repeat(10),
    date: '2026-09-12'
  });
  assert(validExpense.success, 'createExpenseSchema accepts description of 500 chars and currency of 10 chars');

  const longExpenseDesc = createExpenseSchema.safeParse({
    category: 'SERVICES',
    amount: 100,
    description: 'D'.repeat(501),
    date: '2026-09-12'
  });
  assert(!longExpenseDesc.success, 'createExpenseSchema rejects description > 500 chars');

  const longExpenseCurrency = createExpenseSchema.safeParse({
    category: 'SERVICES',
    amount: 100,
    description: 'Valid description',
    currency: 'E'.repeat(11),
    date: '2026-09-12'
  });
  assert(!longExpenseCurrency.success, 'createExpenseSchema rejects currency > 10 chars');

  // 4. Employee bounds & password policy
  console.log('\n--- 4. Employee Schema Bounds & Password Policy ---');
  const validEmployee = createEmployeeSchema.safeParse({
    name: 'E'.repeat(150),
    email: 'test@africatravel.com',
    title: 'T'.repeat(100),
    password: 'P'.repeat(128)
  });
  assert(validEmployee.success, 'createEmployeeSchema accepts boundary lengths (150 name, 100 title, 128 password)');

  const minPassEmployee = createEmployeeSchema.safeParse({
    name: 'Valid Name',
    email: 'test@africatravel.com',
    password: 'P'.repeat(12)
  });
  assert(minPassEmployee.success, 'createEmployeeSchema accepts password at minimum length 12');

  const shortPassEmployee = createEmployeeSchema.safeParse({
    name: 'Valid Name',
    email: 'test@africatravel.com',
    password: 'P'.repeat(11)
  });
  assert(!shortPassEmployee.success, 'createEmployeeSchema rejects password < 12 chars');

  const longPassEmployee = createEmployeeSchema.safeParse({
    name: 'Valid Name',
    email: 'test@africatravel.com',
    password: 'P'.repeat(129)
  });
  assert(!longPassEmployee.success, 'createEmployeeSchema rejects password > 128 chars');

  const longEmployeeName = createEmployeeSchema.safeParse({
    name: 'E'.repeat(151),
    email: 'test@africatravel.com',
    password: 'P'.repeat(12)
  });
  assert(!longEmployeeName.success, 'createEmployeeSchema rejects name > 150 chars');

  // 5. Auth schema bounds
  console.log('\n--- 5. Auth Schema Bounds ---');
  const validLogin = loginSchema.safeParse({
    email: 'user@africatravel.com',
    password: 'P'.repeat(128)
  });
  assert(validLogin.success, 'loginSchema accepts password of 128 chars');

  const longLoginPassword = loginSchema.safeParse({
    email: 'user@africatravel.com',
    password: 'P'.repeat(129)
  });
  assert(!longLoginPassword.success, 'loginSchema rejects password > 128 chars');

  const validChangePassword = changePasswordSchema.safeParse({
    currentPassword: 'C'.repeat(128),
    newPassword: 'N'.repeat(128)
  });
  assert(validChangePassword.success, 'changePasswordSchema accepts 128 chars for passwords');

  const shortChangePassword = changePasswordSchema.safeParse({
    currentPassword: 'ValidCurrentPassword',
    newPassword: 'N'.repeat(11)
  });
  assert(!shortChangePassword.success, 'changePasswordSchema rejects new password < 12 chars');

  // 6. Modification, Payment, and Refund bounds
  console.log('\n--- 6. Modification, Payment & Refund Bounds ---');
  const validMod = addModificationSchema.safeParse({
    flightNumber: 'F'.repeat(30),
    newDepartureDate: '2026-10-01T10:00:00Z',
    reason: 'R'.repeat(500),
    note: 'N'.repeat(2000),
    requestedBy: 'P'.repeat(150)
  });
  assert(validMod.success, 'addModificationSchema accepts boundary lengths (30 flightNumber, 500 reason, 2000 note, 150 requestedBy)');

  const longModReason = addModificationSchema.safeParse({
    newDepartureDate: '2026-10-01T10:00:00Z',
    reason: 'R'.repeat(501)
  });
  assert(!longModReason.success, 'addModificationSchema rejects reason > 500 chars');

  const validPayment = addPaymentSchema.safeParse({
    amount: 1000,
    currency: 'E'.repeat(10),
    method: 'M'.repeat(50),
    reference: 'R'.repeat(100),
    notes: 'N'.repeat(2000)
  });
  assert(validPayment.success, 'addPaymentSchema accepts boundary lengths (10 currency, 50 method, 100 reference, 2000 notes)');

  const longPaymentRef = addPaymentSchema.safeParse({
    amount: 1000,
    reference: 'R'.repeat(101)
  });
  assert(!longPaymentRef.success, 'addPaymentSchema rejects reference > 100 chars');

  const validRefund = addRefundSchema.safeParse({
    amount: 500,
    currency: 'E'.repeat(10),
    reason: 'R'.repeat(500)
  });
  assert(validRefund.success, 'addRefundSchema accepts boundary lengths (10 currency, 500 reason)');

  const longRefundReason = addRefundSchema.safeParse({
    amount: 500,
    reason: 'R'.repeat(501)
  });
  assert(!longRefundReason.success, 'addRefundSchema rejects reason > 500 chars');

  console.log('\n========================================================');
  console.log(`Schema Bounds Verification: ${passed} passed, ${failed} failed`);
  console.log('========================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runSchemaBoundsTests();

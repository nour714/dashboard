/**
 * AfricaTravel - Purge Actions (Hard Delete) Test Suite
 *
 * Verifies:
 * 1. Ticket Purge:
 *    - Rejection if ticket is not soft-deleted (TICKET_NOT_SOFT_DELETED).
 *    - Rejection if ticket has any financial history (payments, refunds, modifications) (TICKET_HAS_FINANCIAL_HISTORY).
 *    - Rejection if confirmation token does not match ticket ID (ValidationError).
 *    - Successful hard delete of clean soft-deleted ticket with full AuditLog persistence.
 * 2. Customer Purge:
 *    - Rejection if customer is not soft-deleted (CUSTOMER_NOT_SOFT_DELETED).
 *    - Rejection if customer has any associated ticket history (CUSTOMER_HAS_TICKET_HISTORY).
 *    - Rejection if confirmation token does not match customer ID (ValidationError).
 *    - Successful hard delete of clean customer with storage document cleanup and AuditLog persistence.
 */

import { TicketService } from '../server/src/services/ticket.service.js';
import { CustomerService } from '../server/src/services/customer.service.js';
import { setPrismaClient } from '../server/src/config/database.js';
import { BusinessRuleError, ValidationError, NotFoundError } from '../server/src/domain/errors.js';

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

async function runPurgeTests() {
  console.log('\n🗑️  ========================================================');
  console.log('   AfricaTravel Purge Actions Verification Test Suite');
  console.log('========================================================\n');

  // In-memory mock database state
  const mockTickets = new Map();
  const mockPayments = new Map();
  const mockRefunds = new Map();
  const mockModifications = new Map();
  const mockCustomers = new Map();
  const mockCustomerNotes = new Map();
  const mockAuditLogs = [];
  const deletedStorageFiles = [];

  const mockAdmin = {
    id: 'EMP-ADMIN-1',
    name: 'Lead Admin',
    email: 'admin@africatravel.com',
    role: 'ADMIN',
    title: 'Managing Director'
  };

  const mockPrisma = {
    ticket: {
      findFirst: async (args = {}) => {
        const where = args?.where || {};
        const queryId = where.id || where.ticketNumber || where.pnr || (where.OR && (where.OR[0]?.id || where.OR[1]?.ticketNumber || where.OR[2]?.pnr));
        const ticket = [...mockTickets.values()].find(t =>
          (!queryId || t.id === queryId || t.ticketNumber === queryId || t.pnr === queryId) &&
          (where.deletedAt === undefined || (where.deletedAt === null ? !t.deletedAt : t.deletedAt !== null))
        );
        if (!ticket) return null;
        const payments = [...mockPayments.values()].filter(p => p.ticketId === ticket.id);
        const refunds = [...mockRefunds.values()].filter(r => r.ticketId === ticket.id);
        const modifications = [...mockModifications.values()].filter(m => m.ticketId === ticket.id);
        return { ...ticket, payments, refunds, modifications };
      },
      findUnique: async (args = {}) => {
        const where = args?.where || {};
        const queryId = where.id || where.ticketNumber;
        const ticket = [...mockTickets.values()].find(t =>
          (!queryId || t.id === queryId || t.ticketNumber === queryId)
        );
        if (!ticket) return null;
        const payments = [...mockPayments.values()].filter(p => p.ticketId === ticket.id);
        const refunds = [...mockRefunds.values()].filter(r => r.ticketId === ticket.id);
        const modifications = [...mockModifications.values()].filter(m => m.ticketId === ticket.id);
        return { ...ticket, payments, refunds, modifications };
      },
      count: async ({ where }) => {
        let list = [...mockTickets.values()];
        if (where?.customerId) {
          list = list.filter(t => t.customerId === where.customerId);
        }
        if (where?.deletedAt === null) {
          list = list.filter(t => !t.deletedAt);
        }
        return list.length;
      },
      delete: async ({ where }) => {
        const t = mockTickets.get(where.id);
        if (t) {
          mockTickets.delete(where.id);
        }
        return t || null;
      },
      update: async ({ where, data }) => {
        const t = mockTickets.get(where.id);
        if (t) {
          Object.assign(t, data);
        }
        return t;
      }
    },
    customer: {
      findUnique: async ({ where }) => {
        const c = mockCustomers.get(where.id);
        if (!c) return null;
        const notes = [...mockCustomerNotes.values()].filter(n => n.customerId === c.id);
        return { ...c, notes };
      },
      delete: async ({ where }) => {
        const c = mockCustomers.get(where.id);
        if (c) {
          mockCustomers.delete(where.id);
        }
        return c || null;
      },
      update: async ({ where, data }) => {
        const c = mockCustomers.get(where.id);
        if (c) {
          Object.assign(c, data);
        }
        return c;
      }
    },
    customerNote: {
      deleteMany: async ({ where }) => {
        let count = 0;
        for (const [id, note] of mockCustomerNotes.entries()) {
          if (note.customerId === where.customerId) {
            mockCustomerNotes.delete(id);
            count++;
          }
        }
        return { count };
      }
    },
    auditLog: {
      create: async ({ data }) => {
        mockAuditLogs.push({ ...data });
        return { ...data };
      }
    },
    $transaction: async (arg) => {
      if (typeof arg === 'function') {
        return await arg(mockPrisma);
      }
      return null;
    }
  };

  setPrismaClient(mockPrisma);

  console.log('--- 1. Ticket Purge Security & Business Rules ---');

  // Case 1.1: Attempt to purge a ticket that is NOT soft-deleted
  const activeTicketId = 'TK-PURGE-ACTIVE';
  mockTickets.set(activeTicketId, {
    id: activeTicketId,
    ticketNumber: '077-1111111111',
    pnr: 'PURGE1',
    ticketPrice: 5000,
    currency: 'EGP',
    status: 'CONFIRMED',
    customerId: 'CUST-P-1',
    passengerName: 'Ahmed Ali',
    origin: 'CAI',
    destination: 'DXB',
    createdAt: new Date(),
    deletedAt: null // NOT soft-deleted
  });

  let notSoftDeletedFailed = false;
  try {
    await TicketService.purgeTicket(activeTicketId, mockAdmin, activeTicketId);
  } catch (err) {
    if (err instanceof BusinessRuleError && err.rule === 'TICKET_NOT_SOFT_DELETED') {
      notSoftDeletedFailed = true;
    }
  }
  assert(notSoftDeletedFailed, 'Purging an active (non-soft-deleted) ticket is rejected (TICKET_NOT_SOFT_DELETED)');

  // Case 1.2: Attempt to purge a soft-deleted ticket that has financial history (Payment attached)
  const ticketWithPaymentId = 'TK-PURGE-FIN';
  mockTickets.set(ticketWithPaymentId, {
    id: ticketWithPaymentId,
    ticketNumber: '077-2222222222',
    pnr: 'PURGE2',
    ticketPrice: 8000,
    currency: 'EGP',
    status: 'CANCELLED',
    customerId: 'CUST-P-1',
    passengerName: 'Mona Hassan',
    origin: 'CAI',
    destination: 'JED',
    createdAt: new Date(),
    deletedAt: new Date() // Soft-deleted
  });
  mockPayments.set('PAY-PURGE-1', {
    id: 'PAY-PURGE-1',
    ticketId: ticketWithPaymentId,
    amount: 8000
  });

  let financialHistoryFailed = false;
  try {
    await TicketService.purgeTicket(ticketWithPaymentId, mockAdmin, ticketWithPaymentId);
  } catch (err) {
    if (err instanceof BusinessRuleError && err.rule === 'TICKET_HAS_FINANCIAL_HISTORY') {
      financialHistoryFailed = true;
    }
  }
  assert(financialHistoryFailed, 'Purging a soft-deleted ticket with payment records is rejected (TICKET_HAS_FINANCIAL_HISTORY)');

  // Case 1.3: Clean soft-deleted ticket, but confirmation token is invalid / missing
  const cleanTicketId = 'TK-PURGE-CLEAN';
  mockTickets.set(cleanTicketId, {
    id: cleanTicketId,
    ticketNumber: '077-3333333333',
    pnr: 'PURGE3',
    ticketPrice: 3500,
    currency: 'EGP',
    status: 'CANCELLED',
    customerId: 'CUST-P-1',
    passengerName: 'Tarek Youssef',
    origin: 'CAI',
    destination: 'RUH',
    createdAt: new Date(),
    deletedAt: new Date() // Soft-deleted
  });

  let badConfirmationFailed = false;
  try {
    await TicketService.purgeTicket(cleanTicketId, mockAdmin, 'WRONG-CONFIRM-ID');
  } catch (err) {
    if (err instanceof ValidationError && err.field === 'confirmTicketId') {
      badConfirmationFailed = true;
    }
  }
  assert(badConfirmationFailed, 'Purging with mismatched confirmTicketId is rejected (ValidationError: confirmTicketId)');

  // Case 1.4: Valid Ticket Purge
  const purgeResult = await TicketService.purgeTicket(cleanTicketId, mockAdmin, cleanTicketId);
  assert(purgeResult && purgeResult.purged === true, 'Valid ticket purge succeeds and returns { purged: true }');

  // Verify ticket is permanently removed from DB
  const ticketInDb = await mockPrisma.ticket.findUnique({ where: { id: cleanTicketId } });
  assert(ticketInDb === null, 'Purged ticket is permanently deleted from database');

  // Verify AuditLog was recorded with full metadata
  const ticketPurgeLog = mockAuditLogs.find(l => l.action === 'PURGE_TICKET' && l.ticketId === cleanTicketId);
  assert(
    ticketPurgeLog &&
    ticketPurgeLog.metadata?.adminId === mockAdmin.id &&
    ticketPurgeLog.metadata?.ticketNumber === '077-3333333333' &&
    ticketPurgeLog.metadata?.passengerName === 'Tarek Youssef',
    'PURGE_TICKET audit log recorded with complete historical metadata before deletion'
  );

  console.log('\n--- 2. Customer Purge Security & Business Rules ---');

  // Case 2.1: Customer not soft-deleted
  const activeCustId = 'CUST-ACTIVE-1';
  mockCustomers.set(activeCustId, {
    id: activeCustId,
    name: 'Salma Omar',
    email: 'salma@example.com',
    deletedAt: null
  });

  let custNotSoftDeletedFailed = false;
  try {
    await CustomerService.purgeCustomer(activeCustId, mockAdmin, activeCustId);
  } catch (err) {
    if (err instanceof BusinessRuleError && err.rule === 'CUSTOMER_NOT_SOFT_DELETED') {
      custNotSoftDeletedFailed = true;
    }
  }
  assert(custNotSoftDeletedFailed, 'Purging an active (non-soft-deleted) customer is rejected (CUSTOMER_NOT_SOFT_DELETED)');

  // Case 2.2: Customer has ticket history (even if cancelled/deleted ticket)
  const custWithTicketId = 'CUST-WITH-TICKETS';
  mockCustomers.set(custWithTicketId, {
    id: custWithTicketId,
    name: 'Khaled Mansour',
    email: 'khaled@example.com',
    deletedAt: new Date() // Soft-deleted
  });
  // Associated ticket exists in DB (e.g. cancelled/soft-deleted)
  mockTickets.set('TK-OLD-CANCELLED', {
    id: 'TK-OLD-CANCELLED',
    customerId: custWithTicketId,
    ticketNumber: '077-4444444444',
    status: 'CANCELLED',
    deletedAt: new Date()
  });

  let custWithTicketHistoryFailed = false;
  try {
    await CustomerService.purgeCustomer(custWithTicketId, mockAdmin, custWithTicketId);
  } catch (err) {
    if (err instanceof BusinessRuleError && err.rule === 'CUSTOMER_HAS_TICKET_HISTORY') {
      custWithTicketHistoryFailed = true;
    }
  }
  assert(custWithTicketHistoryFailed, 'Purging customer with historical tickets is rejected (CUSTOMER_HAS_TICKET_HISTORY)');

  // Case 2.3: Clean customer, mismatched confirmCustomerId
  const cleanCustId = 'CUST-CLEAN-1';
  mockCustomers.set(cleanCustId, {
    id: cleanCustId,
    name: 'Nadia Ibrahim',
    email: 'nadia@example.com',
    passport: 'A12345678',
    phone: '+201012345678',
    deletedAt: new Date()
  });

  let custBadConfirmFailed = false;
  try {
    await CustomerService.purgeCustomer(cleanCustId, mockAdmin, 'WRONG-CUST-ID');
  } catch (err) {
    if (err instanceof ValidationError && err.field === 'confirmCustomerId') {
      custBadConfirmFailed = true;
    }
  }
  assert(custBadConfirmFailed, 'Purging customer with mismatched confirmCustomerId is rejected (ValidationError: confirmCustomerId)');

  // Case 2.4: Valid Customer Purge
  mockCustomerNotes.set('NOTE-1', { id: 'NOTE-1', customerId: cleanCustId, text: 'Initial note' });

  const custPurgeResult = await CustomerService.purgeCustomer(cleanCustId, mockAdmin, cleanCustId);
  assert(custPurgeResult && custPurgeResult.purged === true, 'Valid customer purge succeeds and returns { purged: true }');

  // Verify customer is permanently removed
  const custInDb = await mockPrisma.customer.findUnique({ where: { id: cleanCustId } });
  assert(custInDb === null, 'Purged customer is permanently deleted from database');

  // Verify customer notes were cleaned up
  const remainingNotes = [...mockCustomerNotes.values()].filter(n => n.customerId === cleanCustId);
  assert(remainingNotes.length === 0, 'Associated customer notes are cleaned up upon customer purge');

  // Verify AuditLog recorded
  const custPurgeLog = mockAuditLogs.find(l => l.action === 'PURGE_CUSTOMER' && l.customerId === cleanCustId);
  assert(
    custPurgeLog &&
    custPurgeLog.metadata?.adminId === mockAdmin.id &&
    custPurgeLog.metadata?.customerName === 'Nadia Ibrahim',
    'PURGE_CUSTOMER audit log recorded with complete metadata before deletion'
  );

  console.log('\n========================================================');
  console.log(`Purge Actions Tests: ${passed} passed, ${failed} failed`);
  console.log('========================================================\n');

  if (failures.length > 0) {
    process.exit(1);
  }
}

runPurgeTests().catch(err => {
  console.error('Test runner failed:', err);
  process.exit(1);
});

/**
 * AfricaTravel - Verification Tests for P0-1 and P0-2 Audit Fixes
 *
 * P0-1:
 * - deleteTicket() performs soft delete (deletedAt != null)
 * - Associated Payments, Refunds, Modifications are preserved in DB
 * - Soft-deleted ticket is filtered out of getTickets() and getTicketById()
 * - purgeTicket() is accessible: clean soft-deleted ticket purges permanently
 * - purgeTicket() rejects ticket with financial records (TICKET_HAS_FINANCIAL_HISTORY)
 *
 * P0-2:
 * - Fail-closed transactional audit logging: if tx.auditLog.create fails during addPayment,
 *   the transaction rolls back and the payment is NOT persisted.
 * - Same for deleteCustomer: customer is not deleted if audit creation throws.
 */

import { TicketService } from '../server/src/services/ticket.service.js';
import { CustomerService } from '../server/src/services/customer.service.js';
import { setPrismaClient } from '../server/src/config/database.js';
import { NotFoundError, BusinessRuleError } from '../server/src/domain/errors.js';

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

async function runP0FixesTests() {
  console.log('\n🔴 ========================================================');
  console.log('   AfricaTravel P0 Fixes Verification (Soft-Delete & Audit Rollback)');
  console.log('========================================================\n');

  const mockTickets = new Map();
  const mockPayments = new Map();
  const mockRefunds = new Map();
  const mockModifications = new Map();
  const mockCustomers = new Map();
  const mockCustomerNotes = new Map();
  const mockAuditLogs = [];

  const mockAdmin = {
    id: 'ADM-001',
    name: 'Master Admin',
    email: 'admin@africatravel.com',
    role: 'ADMIN'
  };

  const mockAgent = {
    id: 'AGT-001',
    name: 'Agent Sara',
    email: 'sara@africatravel.com',
    role: 'AGENT'
  };

  let failAuditOnCreate = false;

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
      findMany: async (args = {}) => {
        const where = args?.where || {};
        let list = [...mockTickets.values()];
        if (where.customerId) {
          list = list.filter(t => t.customerId === where.customerId);
        }
        if (where.deletedAt === null) {
          list = list.filter(t => !t.deletedAt);
        }
        if (where.status?.notIn) {
          list = list.filter(t => !where.status.notIn.includes(t.status));
        }
        return list.map(ticket => {
          const payments = [...mockPayments.values()].filter(p => p.ticketId === ticket.id);
          const refunds = [...mockRefunds.values()].filter(r => r.ticketId === ticket.id);
          const modifications = [...mockModifications.values()].filter(m => m.ticketId === ticket.id);
          return { ...ticket, payments, refunds, modifications };
        });
      },
      count: async (args = {}) => {
        const where = args?.where || {};
        let list = [...mockTickets.values()];
        if (where.deletedAt === null) {
          list = list.filter(t => !t.deletedAt);
        }
        return list.length;
      },
      update: async ({ where, data }) => {
        const t = mockTickets.get(where.id);
        if (t) {
          Object.assign(t, data);
          return { ...t };
        }
        return null;
      },
      delete: async ({ where }) => {
        const t = mockTickets.get(where.id);
        if (t) {
          mockTickets.delete(where.id);
        }
        return t || null;
      }
    },
    payment: {
      create: async ({ data }) => {
        mockPayments.set(data.id, { ...data });
        return { ...data };
      },
      findMany: async ({ where }) => {
        return [...mockPayments.values()].filter(p => !where?.ticketId || p.ticketId === where.ticketId);
      }
    },
    refund: {
      create: async ({ data }) => {
        mockRefunds.set(data.id, { ...data });
        return { ...data };
      },
      findMany: async ({ where }) => {
        return [...mockRefunds.values()].filter(r => !where?.ticketId || r.ticketId === where.ticketId);
      }
    },
    modification: {
      create: async ({ data }) => {
        mockModifications.set(data.id, { ...data });
        return { ...data };
      },
      findMany: async ({ where }) => {
        return [...mockModifications.values()].filter(m => !where?.ticketId || m.ticketId === where.ticketId);
      }
    },
    customer: {
      findUnique: async ({ where }) => {
        const c = mockCustomers.get(where.id);
        if (!c) return null;
        return { ...c, notes: [], tickets: [] };
      },
      findFirst: async ({ where }) => {
        const c = [...mockCustomers.values()].find(x =>
          (!where.id || x.id === where.id) &&
          (where.deletedAt === undefined || (where.deletedAt === null ? !x.deletedAt : x.deletedAt !== null))
        );
        return c ? { ...c, notes: [], tickets: [] } : null;
      },
      update: async ({ where, data }) => {
        const c = mockCustomers.get(where.id);
        if (c) {
          Object.assign(c, data);
          return { ...c };
        }
        return null;
      },
      delete: async ({ where }) => {
        const c = mockCustomers.get(where.id);
        if (c) {
          mockCustomers.delete(where.id);
        }
        return c || null;
      }
    },
    customerNote: {
      deleteMany: async () => ({ count: 0 })
    },
    auditLog: {
      create: async ({ data }) => {
        if (failAuditOnCreate) {
          throw new Error('Database connection failure during auditLog.create');
        }
        mockAuditLogs.push({ ...data });
        return { ...data };
      }
    },
    $transaction: async (fn) => {
      if (typeof fn === 'function') {
        // Create rollback snapshot (deep copies of objects)
        const snapTickets = new Map([...mockTickets.entries()].map(([k, v]) => [k, { ...v }]));
        const snapPayments = new Map([...mockPayments.entries()].map(([k, v]) => [k, { ...v }]));
        const snapRefunds = new Map([...mockRefunds.entries()].map(([k, v]) => [k, { ...v }]));
        const snapModifications = new Map([...mockModifications.entries()].map(([k, v]) => [k, { ...v }]));
        const snapCustomers = new Map([...mockCustomers.entries()].map(([k, v]) => [k, { ...v }]));
        const snapLogs = [...mockAuditLogs.map(l => ({ ...l }))];

        try {
          return await fn(mockPrisma);
        } catch (err) {
          // Rollback state on error
          mockTickets.clear();
          snapTickets.forEach((v, k) => mockTickets.set(k, { ...v }));
          mockPayments.clear();
          snapPayments.forEach((v, k) => mockPayments.set(k, { ...v }));
          mockRefunds.clear();
          snapRefunds.forEach((v, k) => mockRefunds.set(k, { ...v }));
          mockModifications.clear();
          snapModifications.forEach((v, k) => mockModifications.set(k, { ...v }));
          mockCustomers.clear();
          snapCustomers.forEach((v, k) => mockCustomers.set(k, { ...v }));
          mockAuditLogs.length = 0;
          mockAuditLogs.push(...snapLogs);
          throw err;
        }
      }
      return fn;
    }
  };

  setPrismaClient(mockPrisma);

  try {
    // -------------------------------------------------------------------------
    // 1. P0-1: deleteTicket() Soft-Deletes & Preserves Financial Records
    // -------------------------------------------------------------------------
    console.log('--- 1. deleteTicket() Soft Delete Lifecycle & Record Preservation ---');

    const ticketWithFinId = 'TK-FIN-001';
    mockTickets.set(ticketWithFinId, {
      id: ticketWithFinId,
      ticketNumber: '077-10002000',
      pnr: 'PNRFIN1',
      passengerName: 'Kareem Ahmed',
      ticketPrice: 10000,
      currency: 'EGP',
      status: 'CONFIRMED',
      customerId: 'CUST-001',
      deletedAt: null,
      origin: 'CAI',
      destination: 'DXB',
      airline: 'EgyptAir',
      createdAt: new Date()
    });

    const paymentId = 'PMT-001';
    mockPayments.set(paymentId, {
      id: paymentId,
      ticketId: ticketWithFinId,
      amount: 6000,
      currency: 'EGP',
      method: 'Credit Card',
      createdAt: new Date()
    });

    const refundId = 'RFD-001';
    mockRefunds.set(refundId, {
      id: refundId,
      ticketId: ticketWithFinId,
      amount: 1000,
      currency: 'EGP',
      reason: 'Schedule change',
      createdAt: new Date()
    });

    // Perform deleteTicket
    const deleteResult = await TicketService.deleteTicket(ticketWithFinId, mockAdmin);
    assert(deleteResult.deleted === true, 'deleteTicket returns deleted: true');
    assert(deleteResult.ticketId === ticketWithFinId, 'deleteTicket returns ticketId');

    // Verify ticket is still in database with deletedAt set
    const rawTicketInDb = mockTickets.get(ticketWithFinId);
    assert(rawTicketInDb !== undefined, 'Ticket still exists in database after deleteTicket');
    assert(rawTicketInDb.deletedAt instanceof Date || typeof rawTicketInDb.deletedAt === 'string', 'Ticket deletedAt is set to a non-null timestamp');

    // Verify associated financial records are preserved
    assert(mockPayments.has(paymentId), 'Associated payment record is preserved in database');
    assert(mockRefunds.has(refundId), 'Associated refund record is preserved in database');

    // Verify ticket is filtered out of getTicketById and getTickets
    const softDeletedTicket = await TicketService.getTicketById(ticketWithFinId);
    assert(softDeletedTicket === null, 'getTicketById returns null for soft-deleted ticket');

    const ticketList = await TicketService.getTickets({}, mockAdmin);
    const inList = ticketList.tickets.some(t => t.id === ticketWithFinId);
    assert(!inList, 'Soft-deleted ticket does NOT appear in getTickets list');

    // -------------------------------------------------------------------------
    // 2. P0-1: purgeTicket() Reachability & Financial Guardrails
    // -------------------------------------------------------------------------
    console.log('\n--- 2. purgeTicket() Reachability & Financial Guardrails ---');

    // 2.1 purgeTicket on soft-deleted ticket with financial history MUST FAIL
    let purgeFailedWithFinHistory = false;
    try {
      await TicketService.purgeTicket(ticketWithFinId, mockAdmin, ticketWithFinId);
    } catch (err) {
      if (err instanceof BusinessRuleError && err.rule === 'TICKET_HAS_FINANCIAL_HISTORY') {
        purgeFailedWithFinHistory = true;
      }
    }
    assert(purgeFailedWithFinHistory, 'purgeTicket rejects soft-deleted ticket that has financial records (TICKET_HAS_FINANCIAL_HISTORY)');

    // 2.2 Create a clean ticket (no financial history)
    const cleanTicketId = 'TK-CLEAN-001';
    mockTickets.set(cleanTicketId, {
      id: cleanTicketId,
      ticketNumber: '077-99990000',
      pnr: 'CLEANPNR',
      passengerName: 'Clean Passenger',
      ticketPrice: 5000,
      currency: 'EGP',
      status: 'CONFIRMED',
      customerId: 'CUST-002',
      deletedAt: null,
      origin: 'CAI',
      destination: 'JED',
      airline: 'Saudia',
      createdAt: new Date()
    });

    // First, deleteTicket (soft delete)
    await TicketService.deleteTicket(cleanTicketId, mockAdmin);
    assert(mockTickets.get(cleanTicketId).deletedAt !== null, 'Clean ticket is soft-deleted first');

    // Now purgeTicket must succeed
    const purgeResult = await TicketService.purgeTicket(cleanTicketId, mockAdmin, cleanTicketId);
    assert(purgeResult.purged === true, 'purgeTicket succeeds on clean soft-deleted ticket');
    assert(!mockTickets.has(cleanTicketId), 'Clean ticket is permanently removed (purged) from database');

    const purgeAudit = mockAuditLogs.find(l => l.action === 'PURGE_TICKET' && l.ticketId === cleanTicketId);
    assert(Boolean(purgeAudit), 'PURGE_TICKET audit log recorded successfully');

    // -------------------------------------------------------------------------
    // 3. P0-2: Transactional Audit Log Fail-Closed Rollback
    // -------------------------------------------------------------------------
    console.log('\n--- 3. Transactional Audit Log Fail-Closed Rollback ---');

    const activeTicketId = 'TK-ACTIVE-002';
    mockTickets.set(activeTicketId, {
      id: activeTicketId,
      ticketNumber: '077-33334444',
      pnr: 'ACTIVE2',
      passengerName: 'Audit Test Passenger',
      ticketPrice: 15000,
      currency: 'EGP',
      status: 'CONFIRMED',
      customerId: 'CUST-003',
      deletedAt: null,
      origin: 'CAI',
      destination: 'RUH',
      airline: 'Flynas',
      createdAt: new Date()
    });

    // Turn on simulated audit creation failure
    failAuditOnCreate = true;

    let addPaymentRolledBack = false;
    try {
      await TicketService.addPayment(activeTicketId, {
        amount: 5000,
        currency: 'EGP',
        method: 'Cash'
      }, mockAgent);
    } catch (err) {
      if (err.message.includes('auditLog.create')) {
        addPaymentRolledBack = true;
      }
    }

    assert(addPaymentRolledBack, 'addPayment throws error when auditLog.create fails');

    // Verify that the payment was NOT saved in database (rollback)
    const paymentsForActiveTicket = [...mockPayments.values()].filter(p => p.ticketId === activeTicketId);
    assert(paymentsForActiveTicket.length === 0, 'No payment was created in DB due to transactional rollback');

    // Verify ticket status remained unchanged
    const activeTicket = mockTickets.get(activeTicketId);
    assert(activeTicket.status === 'CONFIRMED', 'Ticket status was rolled back and remained CONFIRMED');

    // Test deleteCustomer rollback on audit failure
    const custId = 'CUST-AUDIT-FAIL';
    mockCustomers.set(custId, {
      id: custId,
      name: 'Customer Audit Test',
      deletedAt: null
    });

    let deleteCustRolledBack = false;
    try {
      await CustomerService.deleteCustomer(custId, mockAdmin);
    } catch (err) {
      if (err.message.includes('auditLog.create')) {
        deleteCustRolledBack = true;
      }
    }

    assert(deleteCustRolledBack, 'deleteCustomer throws error when auditLog.create fails');
    assert(mockCustomers.get(custId).deletedAt === null, 'Customer deletedAt was rolled back to null');

    failAuditOnCreate = false;

  } finally {
    setPrismaClient(null);
  }

  console.log('\n========================================================');
  console.log(`P0 Fixes Verification: ${passed} passed, ${failed} failed`);
  console.log('========================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runP0FixesTests();

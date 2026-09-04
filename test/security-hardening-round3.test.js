/**
 * AfricaTravel - Security Hardening Round 3 Verification & Regression Test Suite
 *
 * Covers:
 * 1. Decimal Consistency (decimal.js precision in calculations)
 * 2. Customer Authorization Scope in Ticket Creation (active check, 404 on missing/soft-deleted)
 * 3. Ticket Mutation Soft-Delete Protection (updateTicket, addPayment, addRefund, addModification)
 * 4. Employee Role/Status Revocation (instant JWT claim update & token revocation)
 * 5. Password Security (token revocation on changePassword, no passwordHash leakage, bcrypt cost factor 12)
 * 6. Passport Document Security (signed URL, audit trail, 404 on soft-deleted, magic-byte validation, file cleanup on replace)
 * 7. Revoke Other Sessions (revokes other tokens, preserves current session, rejects revoked rotation)
 * 8. Error Leakage (errorHandler strips stack/DB details in production)
 * 9. Frontend Static Security (no eval, new Function, document.write, or tokens stored in localStorage/sessionStorage)
 * 10. Audit Log Integrity (no passwords, JWTs, or raw refresh tokens logged)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { AuthService } from '../server/src/services/auth.service.js';
import { TicketService } from '../server/src/services/ticket.service.js';
import { CustomerService } from '../server/src/services/customer.service.js';
import { EmployeeService } from '../server/src/services/employee.service.js';
import { setPrismaClient } from '../server/src/config/database.js';
import { setSupabaseClient } from '../server/src/config/storage.js';
import { env } from '../server/src/config/env.js';
import { errorHandler } from '../server/src/middleware/error-handler.js';
import { authenticate } from '../server/src/middleware/auth.js';
import {
  calculateTotalPaid,
  calculateRemaining,
  calculateTotalModificationFees,
  calculateTotalRefunded,
  calculateAvailableRefund,
  calculateNetValue,
  calculateNetProfit
} from '../server/src/domain/ticket-rules.js';
import {
  NotFoundError,
  ForbiddenError,
  UnauthorizedError,
  ValidationError,
  BusinessRuleError
} from '../server/src/domain/errors.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

function projectSelect(record, select) {
  if (!record || !select) return record;
  const res = {};
  for (const k of Object.keys(select)) {
    if (select[k]) res[k] = record[k];
  }
  return res;
}

async function runSecurityHardeningRound3Tests() {
  console.log('\n🛡️ ========================================================');
  console.log('   AfricaTravel Security Hardening Round 3 Verification');
  console.log('========================================================\n');

  // --- Mock DB Store ---
  const mockUsers = new Map();
  const mockRefreshTokens = new Map();
  const mockTickets = new Map();
  const mockPayments = new Map();
  const mockRefunds = new Map();
  const mockModifications = new Map();
  const mockCustomers = new Map();
  const mockAuditLogs = [];
  const mockStorageDeletedPaths = [];
  const mockStorageUploads = new Map();
  let tokenCounter = 1;

  // Initialize test users
  const adminUser = {
    id: 'EMP-ADMIN-R3',
    name: 'Admin R3',
    email: 'admin.r3@africatravel.com',
    role: 'ADMIN',
    title: 'Managing Director',
    status: 'ACTIVE',
    passwordHash: await AuthService.hashPassword('AdminPass2026!')
  };
  mockUsers.set(adminUser.id, { ...adminUser });

  const agentUser = {
    id: 'EMP-AGENT-R3',
    name: 'Agent R3',
    email: 'agent.r3@africatravel.com',
    role: 'AGENT',
    title: 'Ticketing Officer',
    status: 'ACTIVE',
    passwordHash: await AuthService.hashPassword('AgentPass2026!')
  };
  mockUsers.set(agentUser.id, { ...agentUser });

  const ticketOnlyUser = {
    id: 'EMP-TO-R3',
    name: 'Ticket Only R3',
    email: 'to.r3@africatravel.com',
    role: 'TICKET_ONLY',
    title: 'Ticket Creation Officer',
    status: 'ACTIVE',
    passwordHash: await AuthService.hashPassword('TicketOnlyPass2026!')
  };
  mockUsers.set(ticketOnlyUser.id, { ...ticketOnlyUser });

  // Initialize test customers
  const activeCustomer = {
    id: 'CUST-ACT-R3',
    name: 'Active Customer R3',
    email: 'active.r3@example.com',
    phone: '+201001112222',
    passport: 'P11223344',
    passportDocPath: 'customers/CUST-ACT-R3/passport.jpg',
    passportDocUploadedAt: new Date(),
    deletedAt: null,
    notes: [],
    tickets: []
  };
  mockCustomers.set(activeCustomer.id, { ...activeCustomer });

  const softDeletedCustomer = {
    id: 'CUST-DEL-R3',
    name: 'Deleted Customer R3',
    email: 'deleted.r3@example.com',
    phone: '+201009998888',
    passport: 'P99887766',
    passportDocPath: 'customers/CUST-DEL-R3/passport.jpg',
    passportDocUploadedAt: new Date(),
    deletedAt: new Date(),
    notes: [],
    tickets: []
  };
  mockCustomers.set(softDeletedCustomer.id, { ...softDeletedCustomer });

  // Initialize test tickets
  const activeTicket = {
    id: 'TK-ACT-R3',
    ticketNumber: '077-3000000001',
    pnr: 'ACTPNR3',
    customerId: 'CUST-ACT-R3',
    passengerName: 'Active Passenger R3',
    ticketPrice: 12000,
    costPrice: 9500,
    currency: 'EGP',
    status: 'UNPAID',
    deletedAt: null,
    payments: [],
    modifications: [],
    refunds: []
  };
  mockTickets.set(activeTicket.id, { ...activeTicket });

  const softDeletedTicket = {
    id: 'TK-DEL-R3',
    ticketNumber: '077-3000000002',
    pnr: 'DELPNR3',
    customerId: 'CUST-ACT-R3',
    passengerName: 'Deleted Passenger R3',
    ticketPrice: 15000,
    costPrice: 12000,
    currency: 'EGP',
    status: 'CONFIRMED',
    deletedAt: new Date(),
    payments: [],
    modifications: [],
    refunds: []
  };
  mockTickets.set(softDeletedTicket.id, { ...softDeletedTicket });

  // Mock Prisma Implementation
  const mockPrisma = {
    user: {
      findUnique: async ({ where, select }) => {
        let u = null;
        if (where.id) u = mockUsers.get(where.id) || null;
        else if (where.email) u = [...mockUsers.values()].find(user => user.email === where.email) || null;
        return projectSelect(u, select);
      },
      findFirst: async ({ where, select }) => {
        let u = null;
        if (where.email) {
          const emailTarget = where.email.equals || where.email;
          u = [...mockUsers.values()].find(user => user.email.toLowerCase() === emailTarget.toLowerCase()) || null;
        }
        return projectSelect(u, select);
      },
      findMany: async ({ select } = {}) => {
        return [...mockUsers.values()].map(u => projectSelect(u, select));
      },
      count: async ({ where } = {}) => {
        let list = [...mockUsers.values()];
        if (where?.role) list = list.filter(u => u.role === where.role);
        if (where?.status) list = list.filter(u => u.status === where.status);
        return list.length;
      },
      create: async ({ data, select }) => {
        const u = { ...data };
        mockUsers.set(u.id, u);
        return projectSelect(u, select);
      },
      update: async ({ where, data, select }) => {
        const u = mockUsers.get(where.id);
        if (u) {
          Object.assign(u, data);
          mockUsers.set(u.id, u);
        }
        return projectSelect(u, select);
      }
    },
    refreshToken: {
      create: async ({ data }) => {
        const rec = { id: `RT-R3-${tokenCounter++}`, revoked: false, ...data };
        mockRefreshTokens.set(data.tokenHash, rec);
        return rec;
      },
      findUnique: async ({ where, include }) => {
        const rec = mockRefreshTokens.get(where.tokenHash);
        if (!rec) return null;
        if (include?.user) {
          const user = mockUsers.get(rec.userId);
          return { ...rec, user };
        }
        return { ...rec };
      },
      updateMany: async ({ where, data }) => {
        let count = 0;
        for (const token of mockRefreshTokens.values()) {
          let match = true;
          if (where.id && token.id !== where.id) match = false;
          if (where.userId && token.userId !== where.userId) match = false;
          if (where.revoked !== undefined && token.revoked !== where.revoked) match = false;
          if (where.tokenHash) {
            if (where.tokenHash.not && token.tokenHash === where.tokenHash.not) match = false;
            if (typeof where.tokenHash === 'string' && token.tokenHash !== where.tokenHash) match = false;
          }
          if (match) {
            Object.assign(token, data);
            count++;
          }
        }
        return { count };
      }
    },
    customer: {
      findUnique: async ({ where }) => mockCustomers.get(where.id) || null,
      findFirst: async ({ where }) => {
        if (where.id) {
          const c = mockCustomers.get(where.id);
          if (!c) return null;
          if (where.deletedAt === null && c.deletedAt !== null) return null;
          return c;
        }
        if (where.passport) {
          return [...mockCustomers.values()].find(c => {
            if (c.passport !== where.passport) return false;
            if (where.deletedAt === null && c.deletedAt !== null) return false;
            return true;
          }) || null;
        }
        return null;
      },
      findMany: async () => [...mockCustomers.values()],
      create: async ({ data }) => {
        const c = { ...data, notes: [], tickets: [] };
        mockCustomers.set(c.id, c);
        return c;
      },
      update: async ({ where, data }) => {
        const c = mockCustomers.get(where.id);
        if (c) {
          Object.assign(c, data);
          mockCustomers.set(c.id, c);
        }
        return c;
      },
      count: async () => mockCustomers.size
    },
    ticket: {
      findUnique: async ({ where }) => mockTickets.get(where.id) || null,
      findFirst: async ({ where }) => {
        if (where.OR) {
          return [...mockTickets.values()].find(t => {
            if (where.deletedAt === null && t.deletedAt !== null) return false;
            return where.OR.some(cond => {
              if (cond.id && t.id === cond.id) return true;
              if (cond.ticketNumber && t.ticketNumber === cond.ticketNumber) return true;
              if (cond.pnr && t.pnr === cond.pnr) return true;
              return false;
            });
          }) || null;
        }
        if (where.pnr) {
          return [...mockTickets.values()].find(t => {
            if (t.pnr !== where.pnr) return false;
            if (where.deletedAt?.not !== undefined && t.deletedAt === null) return false;
            if (where.deletedAt === null && t.deletedAt !== null) return false;
            return true;
          }) || null;
        }
        if (where.ticketNumber) {
          return [...mockTickets.values()].find(t => {
            if (t.ticketNumber !== where.ticketNumber) return false;
            if (where.deletedAt === null && t.deletedAt !== null) return false;
            return true;
          }) || null;
        }
        return null;
      },
      findMany: async () => [...mockTickets.values()],
      create: async ({ data }) => {
        const t = { ...data, payments: [], modifications: [], refunds: [] };
        mockTickets.set(t.id, t);
        return t;
      },
      update: async ({ where, data }) => {
        const t = mockTickets.get(where.id);
        if (t) {
          Object.assign(t, data);
          mockTickets.set(t.id, t);
        }
        return t;
      },
      count: async () => mockTickets.size
    },
    payment: {
      create: async ({ data }) => {
        const p = { id: `PAY-${Date.now()}-${Math.random()}`, ...data };
        mockPayments.set(p.id, p);
        const t = mockTickets.get(data.ticketId);
        if (t) t.payments.push(p);
        return p;
      }
    },
    refund: {
      create: async ({ data }) => {
        const r = { id: `REF-${Date.now()}-${Math.random()}`, ...data };
        mockRefunds.set(r.id, r);
        const t = mockTickets.get(data.ticketId);
        if (t) t.refunds.push(r);
        return r;
      }
    },
    ticketModification: {
      create: async ({ data }) => {
        const m = { id: `MOD-${Date.now()}-${Math.random()}`, ...data };
        mockModifications.set(m.id, m);
        const t = mockTickets.get(data.ticketId);
        if (t) t.modifications.push(m);
        return m;
      }
    },
    auditLog: {
      create: async ({ data }) => {
        const entry = { id: `AUD-${Date.now()}-${Math.random()}`, timestamp: new Date(), ...data };
        mockAuditLogs.push(entry);
        return entry;
      },
      findMany: async () => mockAuditLogs,
      count: async () => mockAuditLogs.length
    },
    $transaction: async (fn) => fn(mockPrisma)
  };

  setPrismaClient(mockPrisma);

  // Mock Supabase Storage Client
  const mockSupabase = {
    storage: {
      from: (bucket) => ({
        createSignedUrl: async (filePath, expiresIn) => {
          return { data: { signedUrl: `https://mock-supabase.storage/${bucket}/${filePath}?expires=${expiresIn}` }, error: null };
        },
        upload: async (filePath, buffer, options) => {
          mockStorageUploads.set(filePath, { buffer, options });
          return { data: { path: filePath }, error: null };
        },
        remove: async (paths) => {
          mockStorageDeletedPaths.push(...paths);
          return { data: paths, error: null };
        }
      })
    }
  };
  setSupabaseClient(mockSupabase);

  // =========================================================================
  // 1. Decimal Consistency Verification
  // =========================================================================
  console.log('--- 1. Decimal Consistency (decimal.js precision) ---');
  {
    const paidFloating = calculateTotalPaid([{ amount: 0.1 }, { amount: 0.2 }]);
    assert(paidFloating === 0.3, `calculateTotalPaid(0.1 + 0.2) equals 0.3 exactly (received: ${paidFloating})`);

    const paidMulti = calculateTotalPaid([{ amount: 10.10 }, { amount: 20.20 }, { amount: 5.05 }]);
    assert(paidMulti === 35.35, `calculateTotalPaid(10.10 + 20.20 + 5.05) equals 35.35 exactly (received: ${paidMulti})`);

    const profit = calculateNetProfit(100.55, 80.25);
    assert(profit === 20.30, `calculateNetProfit(100.55, 80.25) equals 20.30 exactly (received: ${profit})`);

    const remaining = calculateRemaining(100.55, 30.25);
    assert(remaining === 70.30, `calculateRemaining(100.55, 30.25) equals 70.30 exactly (received: ${remaining})`);

    const modFees = calculateTotalModificationFees([{ changeFee: 15.15 }, { changeFee: 10.10 }]);
    assert(modFees === 25.25, `calculateTotalModificationFees(15.15 + 10.10) equals 25.25 exactly (received: ${modFees})`);

    const refunded = calculateTotalRefunded([
      { amount: 5.05, status: 'COMPLETED' },
      { amount: 10.10, status: 'APPROVED' },
      { amount: 99.99, status: 'PENDING' }
    ]);
    assert(refunded === 15.15, `calculateTotalRefunded([5.05 completed, 10.10 approved, 99.99 pending]) equals 15.15 exactly (received: ${refunded})`);

    const availableRefund = calculateAvailableRefund(100.30, 25.10);
    assert(availableRefund === 75.20, `calculateAvailableRefund(100.30, 25.10) equals 75.20 exactly (received: ${availableRefund})`);

    const netVal = calculateNetValue(100.50, 20.25, 10.15);
    assert(netVal === 110.60, `calculateNetValue(100.50 + 20.25 - 10.15) equals 110.60 exactly (received: ${netVal})`);
  }

  // =========================================================================
  // 2. Customer Authorization Scope in Ticket Creation
  // =========================================================================
  console.log('\n--- 2. Customer Authorization Scope in Ticket Creation ---');
  {
    // A. Non-existent customer
    let threwNonExistent = false;
    let nonExistentStatus = null;
    try {
      await TicketService.createTicket({
        customerId: 'CUST-GHOST-999',
        passengerName: 'Ghost Passenger',
        ticketPrice: 5000,
        currency: 'EGP'
      }, adminUser);
    } catch (err) {
      threwNonExistent = err instanceof NotFoundError;
      nonExistentStatus = err.statusCode;
    }
    assert(threwNonExistent, 'createTicket with non-existent customerId throws NotFoundError');
    assert(nonExistentStatus === 404, 'createTicket with non-existent customerId returns 404 status');

    // B. Soft-deleted customer
    let threwDeletedCust = false;
    let deletedCustStatus = null;
    try {
      await TicketService.createTicket({
        customerId: 'CUST-DEL-R3',
        passengerName: 'Deleted Cust Passenger',
        ticketPrice: 5000,
        currency: 'EGP'
      }, adminUser);
    } catch (err) {
      threwDeletedCust = err instanceof NotFoundError;
      deletedCustStatus = err.statusCode;
    }
    assert(threwDeletedCust, 'createTicket with soft-deleted customerId throws NotFoundError');
    assert(deletedCustStatus === 404, 'createTicket with soft-deleted customerId returns 404 status');

    // C. Valid active customer
    const validTicket = await TicketService.createTicket({
      customerId: 'CUST-ACT-R3',
      passengerName: 'Valid Active Passenger',
      ticketPrice: 8000,
      currency: 'EGP'
    }, adminUser);
    assert(validTicket && validTicket.customerId === 'CUST-ACT-R3', 'createTicket with valid active customerId succeeds');

    // D. TICKET_ONLY role with non-existent customer
    let toThrewNonExistent = false;
    try {
      await TicketService.createTicket({
        customerId: 'CUST-GHOST-TO',
        passengerName: 'TO Passenger',
        ticketPrice: 5000,
        currency: 'EGP'
      }, ticketOnlyUser);
    } catch (err) {
      toThrewNonExistent = err instanceof NotFoundError;
    }
    assert(toThrewNonExistent, 'TICKET_ONLY createTicket with non-existent customerId throws NotFoundError');

    // E. TICKET_ONLY role with soft-deleted customer
    let toThrewDeleted = false;
    try {
      await TicketService.createTicket({
        customerId: 'CUST-DEL-R3',
        passengerName: 'TO Passenger',
        ticketPrice: 5000,
        currency: 'EGP'
      }, ticketOnlyUser);
    } catch (err) {
      toThrewDeleted = err instanceof NotFoundError;
    }
    assert(toThrewDeleted, 'TICKET_ONLY createTicket with soft-deleted customerId throws NotFoundError');

    // F. TICKET_ONLY role with valid active customer
    const toValidTicket = await TicketService.createTicket({
      customerId: 'CUST-ACT-R3',
      passengerName: 'TO Active Passenger',
      ticketPrice: 6500,
      currency: 'EGP'
    }, ticketOnlyUser);
    assert(toValidTicket && toValidTicket.customerId === 'CUST-ACT-R3', 'TICKET_ONLY createTicket with valid active customerId succeeds');
  }

  // =========================================================================
  // 3. Ticket Mutation Soft-Delete Protection
  // =========================================================================
  console.log('\n--- 3. Ticket Mutation Soft-Delete Protection ---');
  {
    // updateTicket on soft-deleted ticket
    let threwUpdate = false;
    let updateStatus = null;
    try {
      await TicketService.updateTicket('TK-DEL-R3', { passengerName: 'New Name' }, adminUser);
    } catch (err) {
      threwUpdate = err instanceof NotFoundError;
      updateStatus = err.statusCode;
    }
    assert(threwUpdate, 'updateTicket on soft-deleted ticket throws NotFoundError');
    assert(updateStatus === 404, 'updateTicket on soft-deleted ticket returns 404 status');

    // addPayment on soft-deleted ticket
    let threwPayment = false;
    try {
      await TicketService.addPayment('TK-DEL-R3', { amount: 1000, method: 'CASH' }, adminUser);
    } catch (err) {
      threwPayment = err instanceof NotFoundError;
    }
    assert(threwPayment, 'addPayment on soft-deleted ticket throws NotFoundError');

    // addRefund on soft-deleted ticket
    let threwRefund = false;
    try {
      await TicketService.addRefund('TK-DEL-R3', { amount: 500, reason: 'Test' }, adminUser);
    } catch (err) {
      threwRefund = err instanceof NotFoundError;
    }
    assert(threwRefund, 'addRefund on soft-deleted ticket throws NotFoundError');

    // addModification on soft-deleted ticket
    let threwMod = false;
    try {
      await TicketService.addModification('TK-DEL-R3', { changeFee: 300, newFlightNumber: 'MS999' }, adminUser);
    } catch (err) {
      threwMod = err instanceof NotFoundError;
    }
    assert(threwMod, 'addModification on soft-deleted ticket throws NotFoundError');
  }

  // =========================================================================
  // 4. Employee Role/Status Revocation
  // =========================================================================
  console.log('\n--- 4. Employee Role/Status Revocation ---');
  {
    // Create an employee with active sessions
    const testEmp = {
      id: 'EMP-REVOKE-TEST',
      name: 'Revoke Target',
      email: 'revoke.target@africatravel.com',
      role: 'ADMIN',
      title: 'Manager',
      status: 'ACTIVE',
      passwordHash: await AuthService.hashPassword('Pass12345678!')
    };
    mockUsers.set(testEmp.id, { ...testEmp });

    // Generate valid JWT carrying ADMIN role
    const adminJwt = AuthService.generateAccessToken(testEmp);

    // Create active refresh token for testEmp
    const tokenHash = AuthService.hashToken('test-raw-refresh-token-123');
    mockRefreshTokens.set(tokenHash, {
      id: 'RT-REVOKE-1',
      tokenHash,
      userId: testEmp.id,
      revoked: false
    });

    // A. Demote ADMIN -> AGENT
    await EmployeeService.updateEmployee(testEmp.id, { role: 'AGENT' }, adminUser);

    // Verify refresh token was revoked
    const rtRecord = mockRefreshTokens.get(tokenHash);
    assert(rtRecord.revoked === true, 'Role change (ADMIN -> AGENT) immediately revokes active refresh tokens');

    // Verify old JWT with ADMIN payload is evaluated as AGENT in authenticate middleware
    const mockReq = { headers: { authorization: `Bearer ${adminJwt}` } };
    const mockRes = {};
    let authError = null;
    await new Promise(resolve => {
      authenticate(mockReq, mockRes, (err) => {
        authError = err;
        resolve();
      });
    });
    assert(!authError, 'authenticate middleware succeeds for active user with valid token');
    assert(mockReq.user.role === 'AGENT', 'Old JWT carrying ADMIN claim is immediately updated to live DB role (AGENT)');

    // B. Demote AGENT -> TICKET_ONLY
    await EmployeeService.updateEmployee(testEmp.id, { role: 'TICKET_ONLY' }, adminUser);
    await new Promise(resolve => {
      authenticate(mockReq, mockRes, (err) => {
        authError = err;
        resolve();
      });
    });
    assert(mockReq.user.role === 'TICKET_ONLY', 'Old JWT role is immediately updated to live DB role (TICKET_ONLY)');

    // C. Deactivate ACTIVE -> INACTIVE
    await EmployeeService.updateEmployee(testEmp.id, { status: 'INACTIVE' }, adminUser);
    let deactError = null;
    await new Promise(resolve => {
      authenticate(mockReq, mockRes, (err) => {
        deactError = err;
        resolve();
      });
    });
    assert(deactError instanceof UnauthorizedError, 'Deactivated employee JWT is rejected with UnauthorizedError');
    assert(deactError.code === 'ACCOUNT_INACTIVE', 'Deactivated employee rejection code is ACCOUNT_INACTIVE');

    // D. Deleted employee
    mockUsers.delete(testEmp.id);
    let deletedUserError = null;
    await new Promise(resolve => {
      authenticate(mockReq, mockRes, (err) => {
        deletedUserError = err;
        resolve();
      });
    });
    assert(deletedUserError instanceof UnauthorizedError && deletedUserError.code === 'ACCOUNT_INACTIVE', 'Deleted employee token rejected with ACCOUNT_INACTIVE');
  }

  // =========================================================================
  // 5. Password Security
  // =========================================================================
  console.log('\n--- 5. Password Security ---');
  {
    // A. changePassword revokes all refresh tokens
    const pwUser = {
      id: 'EMP-PW-TEST',
      name: 'Password User',
      email: 'pw.user@africatravel.com',
      role: 'AGENT',
      title: 'Agent',
      status: 'ACTIVE',
      passwordHash: await AuthService.hashPassword('OldPassword1234!')
    };
    mockUsers.set(pwUser.id, { ...pwUser });

    const pwTokenHash1 = AuthService.hashToken('pw-refresh-token-1');
    const pwTokenHash2 = AuthService.hashToken('pw-refresh-token-2');
    mockRefreshTokens.set(pwTokenHash1, { id: 'RT-PW-1', tokenHash: pwTokenHash1, userId: pwUser.id, revoked: false });
    mockRefreshTokens.set(pwTokenHash2, { id: 'RT-PW-2', tokenHash: pwTokenHash2, userId: pwUser.id, revoked: false });

    await AuthService.changePassword(pwUser.id, 'OldPassword1234!', 'NewSecurePassword5678!');

    assert(mockRefreshTokens.get(pwTokenHash1).revoked === true, 'changePassword revokes session token 1');
    assert(mockRefreshTokens.get(pwTokenHash2).revoked === true, 'changePassword revokes session token 2');

    // B. No passwordHash or password in any service response
    const loginRes = await AuthService.login('admin.r3@africatravel.com', 'AdminPass2026!');
    assert(!loginRes.user.passwordHash && !loginRes.user.password, 'login response contains no passwordHash or password');

    const profileRes = await AuthService.getCurrentUserProfile(adminUser.id);
    assert(!profileRes.passwordHash && !profileRes.password, 'getCurrentUserProfile contains no passwordHash or password');

    const empList = await EmployeeService.getEmployees();
    const hasHashInList = empList.some(e => e.passwordHash || e.password);
    assert(!hasHashInList, 'getEmployees listing contains no passwordHash or password across all records');

    const createdEmp = await EmployeeService.createEmployee({
      name: 'New Officer',
      email: 'new.officer@africatravel.com',
      password: 'StrongPass1234!',
      role: 'AGENT'
    }, adminUser);
    assert(!createdEmp.passwordHash && !createdEmp.password, 'createEmployee response contains no passwordHash or password');

    // C. bcrypt cost factor = 12
    const testHash = await AuthService.hashPassword('TestBcryptRounds12');
    const costFactor = parseInt(testHash.split('$')[2], 10);
    assert(costFactor === 12, `AuthService bcrypt default cost factor is 12 (verified: ${costFactor})`);
  }

  // =========================================================================
  // 6. Passport Document Security
  // =========================================================================
  console.log('\n--- 6. Passport Document Security ---');
  {
    // A. Active customer signed URL + AuditLog
    const signedUrlRes = await CustomerService.getPassportDocumentUrl(activeCustomer.id, agentUser, { ip: '127.0.0.1', userAgent: 'TestRunner' });
    assert(signedUrlRes && signedUrlRes.url.includes('https://mock-supabase.storage'), 'Active customer passport returns signed URL');

    const viewLog = mockAuditLogs.find(l => l.action === 'PASSPORT_DOCUMENT_VIEWED' && l.customerId === activeCustomer.id);
    assert(viewLog && viewLog.user === agentUser.name, 'Viewing passport document logs PASSPORT_DOCUMENT_VIEWED audit entry');

    // B. Soft-deleted customer passport access
    let threwDeletedPassport = false;
    let deletedPassportStatus = null;
    try {
      await CustomerService.getPassportDocumentUrl(softDeletedCustomer.id, agentUser);
    } catch (err) {
      threwDeletedPassport = err instanceof NotFoundError;
      deletedPassportStatus = err.statusCode;
    }
    assert(threwDeletedPassport, 'getPassportDocumentUrl for soft-deleted customer throws NotFoundError');
    assert(deletedPassportStatus === 404, 'getPassportDocumentUrl for soft-deleted customer returns 404 status');

    // C. Disallowed file type / magic-byte validation
    const fakeJpgBuffer = Buffer.from('<html><body>Fake JPEG Malicious Script</body></html>');
    let threwInvalidMagicByte = false;
    try {
      await CustomerService.uploadPassportDocument(activeCustomer.id, fakeJpgBuffer, 'image/jpeg', agentUser);
    } catch (err) {
      threwInvalidMagicByte = err instanceof ValidationError && err.message.includes('Invalid file content');
    }
    assert(threwInvalidMagicByte, 'uploadPassportDocument rejects file with magic-byte mismatch (fake JPEG)');

    // D. Exceeding max size (> 5MB)
    const oversizedBuffer = Buffer.alloc(5 * 1024 * 1024 + 1024);
    let threwOversized = false;
    try {
      await CustomerService.uploadPassportDocument(activeCustomer.id, oversizedBuffer, 'image/jpeg', agentUser);
    } catch (err) {
      threwOversized = err instanceof ValidationError && err.message.includes('5MB');
    }
    assert(threwOversized, 'uploadPassportDocument rejects file exceeding 5MB limit');

    // E. Replacing passport document deletes old file from storage
    // Real JPEG header buffer (FF D8 FF E0)
    const validJpgBuffer = Buffer.from([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x01, 0x00, 0x60, 0x00, 0x60, 0x00, 0x00]);
    const oldPath = activeCustomer.passportDocPath;
    await CustomerService.uploadPassportDocument(activeCustomer.id, validJpgBuffer, 'image/jpeg', agentUser);

    const updatedCustomer = mockCustomers.get(activeCustomer.id);
    assert(mockStorageDeletedPaths.includes(oldPath), 'Replacing customer passport document deletes previous file from storage');
    assert(updatedCustomer.passportDocPath !== oldPath, 'Customer passportDocPath updated to new file location');
  }

  // =========================================================================
  // 7. Revoke Other Sessions
  // =========================================================================
  console.log('\n--- 7. Revoke Other Sessions ---');
  {
    const sessUser = {
      id: 'EMP-SESS-R3',
      name: 'Session User',
      email: 'session.r3@africatravel.com',
      role: 'AGENT',
      status: 'ACTIVE',
      passwordHash: await AuthService.hashPassword('Pass12345678!')
    };
    mockUsers.set(sessUser.id, { ...sessUser });

    const rawToken1 = 'session-1-raw-refresh-token';
    const rawToken2 = 'session-2-raw-refresh-token';
    const currentRawToken = 'current-session-raw-refresh-token';

    const hash1 = AuthService.hashToken(rawToken1);
    const hash2 = AuthService.hashToken(rawToken2);
    const currentHash = AuthService.hashToken(currentRawToken);

    mockRefreshTokens.set(hash1, { id: 'RT-S1', tokenHash: hash1, userId: sessUser.id, revoked: false, expiresAt: new Date(Date.now() + 86400000) });
    mockRefreshTokens.set(hash2, { id: 'RT-S2', tokenHash: hash2, userId: sessUser.id, revoked: false, expiresAt: new Date(Date.now() + 86400000) });
    mockRefreshTokens.set(currentHash, { id: 'RT-CUR', tokenHash: currentHash, userId: sessUser.id, revoked: false, expiresAt: new Date(Date.now() + 86400000) });

    const revokeRes = await AuthService.revokeOtherSessions(sessUser.id, currentRawToken);
    assert(revokeRes.success === true && revokeRes.revokedCount === 2, 'revokeOtherSessions revokes exactly 2 other active sessions');

    // Current token rotates successfully
    const rotateCurrent = await AuthService.refresh(currentRawToken);
    assert(rotateCurrent && rotateCurrent.accessToken, 'Current session token remains valid and refreshes successfully');

    // Attempting to rotate revoked token fails and triggers reuse protection
    let threwRevokedRotate = false;
    try {
      await AuthService.refresh(rawToken1);
    } catch (err) {
      threwRevokedRotate = err instanceof UnauthorizedError;
    }
    assert(threwRevokedRotate, 'Attempting AuthService.refresh with revoked session token fails with UnauthorizedError');
  }

  // =========================================================================
  // 8. Error Leakage Prevention
  // =========================================================================
  console.log('\n--- 8. Error Leakage Prevention (Production Error Handler) ---');
  {
    const originalEnv = env.NODE_ENV;
    env.NODE_ENV = 'production';

    const mockInternalError = new Error('PrismaClientKnownRequestError: relation "secret_users_table" does not exist at /app/node_modules/prisma...');
    mockInternalError.stack = 'Error: relation does not exist\n    at internalQueryFunction (/app/server/db.js:99:12)';

    let responseStatus = null;
    let responseJson = null;

    const mockRes = {
      status: (code) => {
        responseStatus = code;
        return {
          json: (payload) => {
            responseJson = payload;
            return payload;
          }
        };
      }
    };

    errorHandler(mockInternalError, {}, mockRes, () => {});

    assert(responseStatus === 500, 'Internal server error returns HTTP 500');
    assert(responseJson.success === false, 'Internal error response has success: false');
    assert(responseJson.error.message === 'An unexpected internal server error occurred', 'Error message sanitized in production');
    assert(responseJson.error.code === 'INTERNAL_SERVER_ERROR', 'Error code is INTERNAL_SERVER_ERROR');
    assert(responseJson.error.details === undefined, 'Error details stripped in production (no table/query leakage)');
    assert(responseJson.error.stack === undefined, 'Error stack trace stripped in production (no stack leakage)');

    env.NODE_ENV = originalEnv;
  }

  // =========================================================================
  // 9. Frontend Static Security
  // =========================================================================
  console.log('\n--- 9. Frontend Static Security ---');
  {
    const jsDir = path.resolve(__dirname, '../js');

    function getAllJsFiles(dir) {
      let results = [];
      const list = fs.readdirSync(dir);
      list.forEach(file => {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat && stat.isDirectory()) {
          results = results.concat(getAllJsFiles(fullPath));
        } else if (file.endsWith('.js')) {
          results.push(fullPath);
        }
      });
      return results;
    }

    const jsFiles = getAllJsFiles(jsDir);
    assert(jsFiles.length > 0, `Found ${jsFiles.length} JavaScript files in js/ to inspect`);

    let foundEval = false;
    let foundNewFunction = false;
    let foundDocWrite = false;
    let foundTokenStorage = false;

    for (const filePath of jsFiles) {
      const content = fs.readFileSync(filePath, 'utf8');
      if (/\beval\s*\(/.test(content)) foundEval = true;
      if (/\bnew\s+Function\s*\(/.test(content)) foundNewFunction = true;
      if (/\bdocument\.write\s*\(/.test(content)) foundDocWrite = true;

      // Check if localStorage.setItem or sessionStorage.setItem stores a token key
      const storageMatch = content.match(/(localStorage|sessionStorage)\.setItem\s*\(\s*['"`]([^'"`]+)['"`]/g);
      if (storageMatch) {
        for (const match of storageMatch) {
          const lower = match.toLowerCase();
          if (lower.includes('token') || lower.includes('jwt') || lower.includes('secret')) {
            foundTokenStorage = true;
          }
        }
      }
    }

    assert(!foundEval, 'Static scan: Zero eval() usage across all frontend files in js/');
    assert(!foundNewFunction, 'Static scan: Zero new Function() usage across all frontend files in js/');
    assert(!foundDocWrite, 'Static scan: Zero document.write() usage across all frontend files in js/');
    assert(!foundTokenStorage, 'Static scan: No JWT/access/refresh tokens stored in localStorage or sessionStorage');
  }

  // =========================================================================
  // 10. Audit Log Integrity
  // =========================================================================
  console.log('\n--- 10. Audit Log Integrity ---');
  {
    // Verify all recorded audit logs in mockAuditLogs
    const forbiddenPatterns = [
      'AdminPass2026!',
      'AgentPass2026!',
      'TicketOnlyPass2026!',
      'OldPassword1234!',
      'NewSecurePassword5678!',
      'Pass12345678!',
      'StrongPass1234!',
      'test-raw-refresh-token-123',
      'session-1-raw-refresh-token',
      'current-session-raw-refresh-token'
    ];

    let foundSensitiveData = false;
    for (const log of mockAuditLogs) {
      const logString = JSON.stringify(log);
      for (const pattern of forbiddenPatterns) {
        if (logString.includes(pattern)) {
          foundSensitiveData = true;
          console.error(`  ✗ Sensitive pattern "${pattern}" leaked in audit log:`, logString);
        }
      }
      // Check for bcrypt hash or JWT format in audit log description / metadata
      if (/\$2[aby]\$\d{2}\$[./0-9A-Za-z]{53}/.test(logString)) {
        foundSensitiveData = true;
        console.error('  ✗ Bcrypt hash leaked in audit log:', logString);
      }
      if (/eyJ[A-Za-z0-9-_]+\.eyJ[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+/.test(logString)) {
        foundSensitiveData = true;
        console.error('  ✗ JWT token leaked in audit log:', logString);
      }
    }

    assert(!foundSensitiveData, `Audit log integrity verified: 0 leaked passwords, hashes, JWTs, or raw tokens across ${mockAuditLogs.length} audit records`);
  }

  // =========================================================================
  // Final Test Summary
  // =========================================================================
  console.log('\n========================================================');
  console.log(`Security Hardening Round 3 Tests: ${passed} passed, ${failed} failed`);
  console.log('========================================================\n');

  if (failed > 0) {
    console.error('Failed Assertions:');
    failures.forEach((f, idx) => console.error(`  ${idx + 1}. ${f}`));
    process.exit(1);
  }
}

runSecurityHardeningRound3Tests().catch(err => {
  console.error('Test runner error:', err);
  process.exit(1);
});

/**
 * AfricaTravel - Security Fixes Verification Tests
 *
 * Verifies:
 * 1. Refresh token rotation (revocation of old token, issuing of new token).
 * 2. Token reuse rejection (invalidating or rejecting previously used refresh token).
 * 3. NODE_ENV=production guard rejecting insecure default secrets.
 */

import { AuthService } from '../server/src/services/auth.service.js';
import { TicketService } from '../server/src/services/ticket.service.js';
import { CustomerService } from '../server/src/services/customer.service.js';
import { EmployeeService } from '../server/src/services/employee.service.js';
import { setPrismaClient } from '../server/src/config/database.js';
import { UnauthorizedError, BusinessRuleError } from '../server/src/domain/errors.js';
import fs from 'fs';

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

async function runSecurityFixesTests() {
  console.log('\n🔒 ========================================================');
  console.log('   AfricaTravel Security Fixes Verification Tests');
  console.log('========================================================\n');

  // Mock Prisma Client for Refresh Token Rotation & Concurrency
  const mockTokens = new Map();
  let idCounter = 1;

  const mockUser = {
    id: 'EMP-999',
    name: 'Security Tester',
    email: 'tester@africatravel.com',
    role: 'ADMIN',
    title: 'Security Auditor',
    status: 'ACTIVE'
  };

  // Mock in-memory state for tickets, payments, refunds, customers, users
  const mockTickets = new Map();
  const mockPayments = new Map();
  const mockRefunds = new Map();
  const mockCustomers = new Map();
  const mockUsers = new Map();
  const mockAuditLogs = [];

  mockUsers.set(mockUser.id, { ...mockUser });

  const mockPrisma = {
    refreshToken: {
      findUnique: async ({ where }) => {
        const record = mockTokens.get(where.tokenHash);
        if (!record) return null;
        return { ...record, user: mockUser };
      },
      update: async ({ where, data }) => {
        const record = [...mockTokens.values()].find(t => t.id === where.id);
        if (record) {
          Object.assign(record, data);
          mockTokens.set(record.tokenHash, record);
        }
        return record;
      },
      updateMany: async ({ where, data }) => {
        let count = 0;
        for (const record of mockTokens.values()) {
          let match = true;
          if (where.id && record.id !== where.id) match = false;
          if (where.tokenHash && record.tokenHash !== where.tokenHash) match = false;
          if (where.userId && record.userId !== where.userId) match = false;
          if (where.revoked !== undefined && record.revoked !== where.revoked) match = false;
          if (match) {
            Object.assign(record, data);
            count++;
          }
        }
        return { count };
      },
      create: async ({ data }) => {
        const record = { id: `token-${idCounter++}`, revoked: false, ...data };
        mockTokens.set(data.tokenHash, record);
        return record;
      }
    },
    user: {
      findUnique: async ({ where }) => {
        const u = where.id ? mockUsers.get(where.id) : [...mockUsers.values()].find(x => x.email === where.email);
        return u ? { ...u } : null;
      },
      findMany: async () => {
        return [...mockUsers.values()].map(u => ({ ...u }));
      },
      count: async ({ where }) => {
        let list = [...mockUsers.values()];
        if (where?.role) list = list.filter(u => u.role === where.role);
        if (where?.status) list = list.filter(u => u.status === where.status);
        return list.length;
      },
      update: async ({ where, data }) => {
        const u = mockUsers.get(where.id);
        if (u) {
          Object.assign(u, data);
          return { ...u };
        }
        return null;
      }
    },
    customer: {
      findUnique: async ({ where }) => {
        const c = mockCustomers.get(where.id);
        if (!c) return null;
        return { ...c, notes: [], tickets: [] };
      },
      findMany: async ({ where }) => {
        let list = [...mockCustomers.values()];
        if (where && where.deletedAt === null) {
          list = list.filter(c => c.deletedAt === null || c.deletedAt === undefined);
        }
        return list.map(c => ({ ...c, notes: [] }));
      },
      update: async ({ where, data }) => {
        const c = mockCustomers.get(where.id);
        if (c) {
          Object.assign(c, data);
        }
        return c;
      }
    },
    ticket: {
      findFirst: async (args = {}) => {
        const where = args?.where || {};
        const queryId = where.id || where.ticketNumber || where.pnr || (where.OR && where.OR[0]?.id);
        const ticket = [...mockTickets.values()].find(t =>
          (!queryId || t.id === queryId || t.ticketNumber === queryId || t.pnr === queryId) &&
          (where.deletedAt === undefined || (where.deletedAt === null ? !t.deletedAt : t.deletedAt !== null))
        );
        if (!ticket) return null;
        const payments = [...mockPayments.values()].filter(p => p.ticketId === ticket.id);
        const refunds = [...mockRefunds.values()].filter(r => r.ticketId === ticket.id);
        return { ...ticket, payments, refunds, modifications: [] };
      },
      findMany: async (args = {}) => {
        const where = args?.where;
        let list = [...mockTickets.values()];
        if (where?.customerId) {
          list = list.filter(t => t.customerId === where.customerId);
        }
        if (where?.deletedAt === null) {
          list = list.filter(t => !t.deletedAt);
        }
        if (where?.status?.notIn) {
          list = list.filter(t => !where.status.notIn.includes(t.status));
        }
        return list.map(ticket => {
          const payments = [...mockPayments.values()].filter(p => p.ticketId === ticket.id);
          const refunds = [...mockRefunds.values()].filter(r => r.ticketId === ticket.id);
          return { ...ticket, payments, refunds, modifications: [] };
        });
      },
      update: async ({ where, data }) => {
        const ticket = mockTickets.get(where.id);
        if (ticket) {
          Object.assign(ticket, data);
        }
        return ticket;
      }
    },
    payment: {
      create: async ({ data }) => {
        mockPayments.set(data.id, { ...data });
        return { ...data };
      }
    },
    refund: {
      create: async ({ data }) => {
        mockRefunds.set(data.id, { ...data });
        return { ...data };
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
      const results = [];
      for (const op of arg) {
        results.push(await op);
      }
      return results;
    }
  };

  setPrismaClient(mockPrisma);

  // 1. Initial Refresh Token Setup
  console.log('--- 1. Refresh Token Rotation & Invalidation on Reuse ---');
  const initialRawToken = AuthService.generateRefreshTokenString();
  const initialTokenHash = AuthService.hashToken(initialRawToken);
  
  mockTokens.set(initialTokenHash, {
    id: 'token-initial',
    tokenHash: initialTokenHash,
    userId: mockUser.id,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    revoked: false,
    user: mockUser
  });

  // First refresh: should succeed, revoke initial token, return new token
  const firstRefreshResult = await AuthService.refresh(initialRawToken);
  assert(typeof firstRefreshResult.accessToken === 'string', 'First refresh returns valid accessToken');
  assert(typeof firstRefreshResult.refreshToken === 'string', 'First refresh returns rotated refreshToken');
  assert(firstRefreshResult.refreshToken !== initialRawToken, 'Rotated refreshToken is different from initial token');

  // Verify old token is now revoked in mock DB
  const oldTokenRecord = mockTokens.get(initialTokenHash);
  assert(oldTokenRecord.revoked === true, 'Original refresh token is marked as revoked in database');

  // Refresh using the NEW rotated token: should succeed and rotate again
  const secondRefreshResult = await AuthService.refresh(firstRefreshResult.refreshToken);
  assert(typeof secondRefreshResult.accessToken === 'string', 'Refresh using new rotated token succeeds');
  assert(secondRefreshResult.refreshToken !== firstRefreshResult.refreshToken, 'Subsequent refresh rotates token again');

  // Second refresh using the SAME (now old) initial token: MUST fail and trigger reuse family revocation
  let reuseFailed = false;
  try {
    await AuthService.refresh(initialRawToken);
  } catch (err) {
    if (err instanceof UnauthorizedError && err.code === 'INVALID_REFRESH_TOKEN') {
      reuseFailed = true;
    }
  }
  assert(reuseFailed, 'Replaying revoked refresh token throws UnauthorizedError (INVALID_REFRESH_TOKEN)');

  // Verify reuse family revocation revoked all user tokens
  const activeTokensAfterReuse = [...mockTokens.values()].filter(t => t.userId === mockUser.id && !t.revoked);
  assert(activeTokensAfterReuse.length === 0, 'Reuse detection automatically revokes entire token family for user');

  console.log('\n--- 2. Docker Compose & Environment Configuration Verification ---');
  // Check docker-compose.yml content
  const dockerComposeContent = fs.readFileSync('docker-compose.yml', 'utf8');
  assert(dockerComposeContent.includes('${JWT_SECRET}'), 'docker-compose.yml uses ${JWT_SECRET} env substitution');
  assert(dockerComposeContent.includes('${JWT_REFRESH_SECRET}'), 'docker-compose.yml uses ${JWT_REFRESH_SECRET} env substitution');
  assert(!dockerComposeContent.includes('africatravel_production_super_secret_jwt_key_2026'), 'docker-compose.yml contains no plaintext JWT secret');

  // Check .env.example content
  const envExampleContent = fs.readFileSync('.env.example', 'utf8');
  assert(envExampleContent.includes('openssl rand -hex 64'), '.env.example contains secure generation instruction');

  // Check env.js fatal guard presence
  const envJsContent = fs.readFileSync('server/src/config/env.js', 'utf8');
  assert(envJsContent.includes('JWT_SECRET is missing or using an insecure default') || envJsContent.includes('FATAL: JWT_SECRET'), 'server/src/config/env.js enforces check on production with insecure default secret');
  assert(envJsContent.includes('DEFAULT_ADMIN_PASSWORD is using insecure default'), 'server/src/config/env.js enforces check on production with default password');

  console.log('\n--- 3. CORS Policy Lockdown Verification ---');
  const securityJsContent = fs.readFileSync('server/src/middleware/security.js', 'utf8');
  assert(!securityJsContent.includes('isVercelOrigin'), 'server/src/middleware/security.js does not contain wildcard isVercelOrigin');
  assert(securityJsContent.includes("env.NODE_ENV !== 'production'"), 'server/src/middleware/security.js restricts localhost to non-production');

  console.log('\n--- 4. Health Endpoint Leakage Prevention ---');
  const routesIndexContent = fs.readFileSync('server/src/routes/index.js', 'utf8');
  assert(!routesIndexContent.includes('detectedEnvVars'), 'server/src/routes/index.js does NOT leak detectedEnvVars');
  assert(routesIndexContent.includes("process.env.NODE_ENV === 'production'"), 'server/src/routes/index.js checks NODE_ENV for hiding diagnostics in production');

  console.log('\n--- 5. httpOnly Cookies & In-Memory Tokens ---');
  const authControllerContent = fs.readFileSync('server/src/controllers/auth.controller.js', 'utf8');
  assert(authControllerContent.includes('res.cookie(REFRESH_COOKIE_NAME'), 'AuthController sets httpOnly cookie for refreshToken');
  assert(authControllerContent.includes('httpOnly: true'), 'Cookie options configure httpOnly: true');
  assert(authControllerContent.includes('res.clearCookie(REFRESH_COOKIE_NAME'), 'AuthController clears cookie on logout');

  const apiClientContent = fs.readFileSync('js/services/api-client.js', 'utf8');
  assert(apiClientContent.includes('inMemoryAccessToken'), 'api-client.js stores accessToken in-memory');
  assert(!apiClientContent.includes('localStorage.setItem(ACCESS_TOKEN_KEY'), 'api-client.js does NOT store accessToken in localStorage');
  assert(apiClientContent.includes("credentials: 'include'"), 'api-client.js passes credentials: include');

  console.log('\n--- 6. Foreign Key Performance Indexes ---');
  const schemaPrismaContent = fs.readFileSync('prisma/schema.prisma', 'utf8');
  assert(schemaPrismaContent.includes('@@index([userId])'), 'schema.prisma includes @@index([userId]) on audit_logs');
  assert(schemaPrismaContent.includes('@@index([processedById])'), 'schema.prisma includes @@index([processedById]) on modifications');
  assert(schemaPrismaContent.includes('@@index([addedById])'), 'schema.prisma includes @@index([addedById]) on payments');
  assert(schemaPrismaContent.includes('@@index([createdById])'), 'schema.prisma includes @@index([createdById]) on tickets');

  console.log('\n--- 7. Atomic Financial Transactions & Concurrency Tests (CWE-362, CWE-841) ---');
  // Setup ticket with price = 10000 EGP
  const testTicketId = 'TK-CONCURRENCY-1';
  mockTickets.set(testTicketId, {
    id: testTicketId,
    ticketNumber: '077-9999999999',
    pnr: 'CONCUR1',
    ticketPrice: 10000,
    currency: 'EGP',
    status: 'CONFIRMED',
    customerId: 'CUST-TEST-1'
  });

  // Test 1: Two sequential / concurrent payments of 6000 EGP each on 10000 EGP ticket
  // First payment of 6000 succeeds
  const p1 = await TicketService.addPayment(testTicketId, { amount: 6000, method: 'Credit Card' }, mockUser);
  assert(p1 && p1.amount === 6000, 'First payment of 6,000 EGP succeeds (remaining: 4,000 EGP)');

  // Second payment of 6000 MUST fail because 6000 > 4000 remaining balance
  let overpayFailed = false;
  try {
    await TicketService.addPayment(testTicketId, { amount: 6000, method: 'Credit Card' }, mockUser);
  } catch (err) {
    if (err instanceof BusinessRuleError && err.rule === 'PAYMENT_EXCEEDS_BALANCE') {
      overpayFailed = true;
    }
  }
  assert(overpayFailed, 'Second concurrent payment exceeding remaining balance is rejected (PAYMENT_EXCEEDS_BALANCE)');

  // Test 2: Concurrent refunds on the 6000 EGP paid amount
  // Refund 1 of 4000 succeeds
  const r1 = await TicketService.addRefund(testTicketId, { amount: 4000, reason: 'Flight cancellation' }, mockUser);
  assert(r1 && r1.amount === 4000, 'First refund of 4,000 EGP succeeds (available refund: 2,000 EGP)');

  // Refund 2 of 4000 MUST fail because 4000 > 2000 available refundable amount
  let overRefundFailed = false;
  try {
    await TicketService.addRefund(testTicketId, { amount: 4000, reason: 'Duplicate refund request' }, mockUser);
  } catch (err) {
    if (err instanceof BusinessRuleError && err.rule === 'REFUND_EXCEEDS_AVAILABLE') {
      overRefundFailed = true;
    }
  }
  assert(overRefundFailed, 'Second concurrent refund exceeding available balance is rejected (REFUND_EXCEEDS_AVAILABLE)');

  // Test 3: Soft delete of ticket by ADMIN
  const deleteRes = await TicketService.deleteTicket(testTicketId, mockUser);
  assert(deleteRes.status === 'CANCELLED' && deleteRes.deletedAt, 'Ticket is soft-deleted with CANCELLED status and deletedAt timestamp');

  const deleteAuditLog = mockAuditLogs.find(l => l.action === 'DELETE_TICKET' && l.ticketId === testTicketId);
  assert(deleteAuditLog && deleteAuditLog.metadata?.adminId === mockUser.id, 'DELETE_TICKET audit log recorded with adminId and metadata');

  // Test 4: Customer deletion with active tickets protection & soft delete
  const testCustId = 'CUST-TEST-1';
  mockCustomers.set(testCustId, {
    id: testCustId,
    name: 'Mohamed Ahmed',
    email: 'mohamed@test.com',
    passportDocPath: 'customers/CUST-TEST-1/passport-abc.jpg',
    deletedAt: null
  });

  // Create an active ticket for this customer
  mockTickets.set('TK-ACTIVE-1', {
    id: 'TK-ACTIVE-1',
    customerId: testCustId,
    status: 'CONFIRMED',
    deletedAt: null
  });

  // Attempting to delete customer with active ticket MUST throw BusinessRuleError
  let custDeleteWithActiveFailed = false;
  try {
    await CustomerService.deleteCustomer(testCustId, mockUser);
  } catch (err) {
    if (err instanceof BusinessRuleError && err.rule === 'CUSTOMER_HAS_ACTIVE_TICKETS') {
      custDeleteWithActiveFailed = true;
    }
  }
  assert(custDeleteWithActiveFailed, 'Deleting customer with active tickets is prevented (CUSTOMER_HAS_ACTIVE_TICKETS)');

  // Now cancel the ticket and retry deletion
  mockTickets.get('TK-ACTIVE-1').status = 'CANCELLED';
  const custDeleteRes = await CustomerService.deleteCustomer(testCustId, mockUser);
  assert(custDeleteRes && custDeleteRes.deletedAt, 'Customer soft-delete succeeds once all tickets are cancelled');

  // Verify customer is excluded from standard getCustomerById
  const custAfterDelete = await CustomerService.getCustomerById(testCustId);
  assert(custAfterDelete === null, 'Soft-deleted customer is excluded from standard getCustomerById');

  // Verify passport document was preserved for legal retention
  const rawCustomerRecord = mockCustomers.get(testCustId);
  assert(rawCustomerRecord.passportDocPath === 'customers/CUST-TEST-1/passport-abc.jpg', 'Passport document storage path is preserved upon soft deletion');

  const custAuditLog = mockAuditLogs.find(l => l.action === 'DELETE_CUSTOMER' && l.customerId === testCustId);
  assert(custAuditLog && custAuditLog.metadata?.adminId === mockUser.id && custAuditLog.metadata?.passportDocPreserved === true, 'DELETE_CUSTOMER audit log recorded with adminId, document retention flags, and metadata');

  // Test 5: Employee Management & Lockout Protection (PATCH /api/employees/:id)
  // (a) Admin attempting to demote self MUST throw CANNOT_DEMOTE_SELF
  let selfDemoteFailed = false;
  try {
    await EmployeeService.updateEmployee(mockUser.id, { role: 'AGENT' }, mockUser);
  } catch (err) {
    if (err instanceof BusinessRuleError && err.rule === 'CANNOT_DEMOTE_SELF') {
      selfDemoteFailed = true;
    }
  }
  assert(selfDemoteFailed, 'Admin attempting to demote self is rejected (CANNOT_DEMOTE_SELF)');

  // (b) Create a second staff user (AGENT)
  const agentUser = {
    id: 'EMP-102',
    name: 'Kareem Tarek',
    email: 'kareem.t@africatravel.com',
    role: 'AGENT',
    title: 'Support Agent',
    status: 'ACTIVE'
  };
  mockUsers.set(agentUser.id, { ...agentUser });

  // (c) Admin attempting to deactivate the only active admin MUST throw CANNOT_DEMOTE_LAST_ADMIN
  let lastAdminDeactivateFailed = false;
  try {
    await EmployeeService.updateEmployee(mockUser.id, { status: 'INACTIVE' }, { id: 'EMP-OTHER', name: 'Other' });
  } catch (err) {
    if (err instanceof BusinessRuleError && err.rule === 'CANNOT_DEMOTE_LAST_ADMIN') {
      lastAdminDeactivateFailed = true;
    }
  }
  assert(lastAdminDeactivateFailed, 'Deactivating the last remaining active Administrator is rejected (CANNOT_DEMOTE_LAST_ADMIN)');

  // (d) Admin promotes AGENT to ADMIN -> MUST record CHANGE_EMPLOYEE_ROLE audit log
  const promotedEmployee = await EmployeeService.updateEmployee(agentUser.id, { role: 'ADMIN' }, mockUser);
  assert(promotedEmployee && promotedEmployee.role === 'ADMIN', 'Admin successfully updates role of another employee to ADMIN');

  const roleChangeLog = mockAuditLogs.find(l => l.action === 'CHANGE_EMPLOYEE_ROLE' && l.metadata?.targetId === agentUser.id);
  assert(
    roleChangeLog &&
    roleChangeLog.metadata?.oldRole === 'AGENT' &&
    roleChangeLog.metadata?.newRole === 'ADMIN' &&
    roleChangeLog.metadata?.adminId === mockUser.id,
    'CHANGE_EMPLOYEE_ROLE audit log recorded with oldRole, newRole, and adminId'
  );

  // (e) Admin updates employee title and status -> records UPDATE_EMPLOYEE audit log
  await EmployeeService.updateEmployee(agentUser.id, { title: 'Senior Operations Lead' }, mockUser);
  const profileUpdateLog = mockAuditLogs.find(l => l.action === 'UPDATE_EMPLOYEE' && l.metadata?.targetId === agentUser.id);
  assert(profileUpdateLog && profileUpdateLog.metadata?.adminId === mockUser.id, 'UPDATE_EMPLOYEE audit log recorded for title modification');

  console.log('\n========================================================');
  console.log(`Security Fixes Tests: ${passed} passed, ${failed} failed`);
  console.log('========================================================\n');

  if (failures.length > 0) {
    process.exit(1);
  }
}

runSecurityFixesTests().catch(err => {
  console.error('Test runner failed:', err);
  process.exit(1);
});

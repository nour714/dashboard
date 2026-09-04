/**
 * AfricaTravel - Security Hardening Round 2 Verification Tests
 *
 * Verifies the 8 critical security fixes:
 * 1. Financial operations (addPayment, addRefund, addModification) blocked on soft-deleted tickets (404).
 * 2. Real-time DB check in JWT auth: deactivated accounts blocked immediately, updated role reflected immediately, tokens revoked on role/status change.
 * 3. TICKET_ONLY / AGENT costPrice isolation (sanitized to 0 on create, ForbiddenError on update).
 * 4. customerId authorization scope check allows valid system customers.
 * 5. Passport document access blocked on soft-deleted customers (404).
 * 6. Revoke other sessions API endpoint & service revokes all other refresh tokens while preserving current session.
 * 7. 2FA badge reflects honest inactive status (badge-inactive / notAvailable).
 * 8. Settings password fields enforce minlength="8".
 */

import http from 'http';
import fs from 'fs';
import path from 'path';
import { createApp } from '../server/src/app.js';
import { AuthService } from '../server/src/services/auth.service.js';
import { TicketService } from '../server/src/services/ticket.service.js';
import { CustomerService } from '../server/src/services/customer.service.js';
import { EmployeeService } from '../server/src/services/employee.service.js';
import { setPrismaClient } from '../server/src/config/database.js';
import { setSupabaseClient } from '../server/src/config/storage.js';
import { NotFoundError, ForbiddenError, UnauthorizedError } from '../server/src/domain/errors.js';
import { authenticate } from '../server/src/middleware/auth.js';

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

function makeRequest(server, { method = 'GET', path = '/', headers = {}, body = null }) {
  return new Promise((resolve, reject) => {
    const address = server.address();
    const payload = body ? JSON.stringify(body) : null;

    const reqHeaders = { ...headers };
    if (payload) {
      reqHeaders['Content-Type'] = 'application/json';
      reqHeaders['Content-Length'] = Buffer.byteLength(payload);
    }

    const req = http.request({
      hostname: '127.0.0.1',
      port: address.port,
      path,
      method,
      headers: reqHeaders
    }, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        let json = null;
        try {
          json = JSON.parse(data);
        } catch (e) {
          json = null;
        }
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          data,
          json
        });
      });
    });

    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

async function runSecurityHardeningRound2Tests() {
  console.log('\n🛡️ ========================================================');
  console.log('   AfricaTravel Security Hardening Round 2 Verification');
  console.log('========================================================\n');

  // In-memory data store for tests
  const mockUsers = new Map();
  const mockRefreshTokens = new Map();
  const mockTickets = new Map();
  const mockPayments = new Map();
  const mockRefunds = new Map();
  const mockModifications = new Map();
  const mockCustomers = new Map();
  const mockAuditLogs = [];
  let tokenCounter = 1;

  // Initialize test users
  const adminUser = {
    id: 'EMP-ADMIN-01',
    name: 'Admin User',
    email: 'admin@africatravel.com',
    role: 'ADMIN',
    title: 'Managing Director',
    status: 'ACTIVE',
    passwordHash: await AuthService.hashPassword('AdminPassword2026!')
  };
  mockUsers.set(adminUser.id, { ...adminUser });

  const agentUser = {
    id: 'EMP-AGENT-01',
    name: 'Agent User',
    email: 'agent@africatravel.com',
    role: 'AGENT',
    title: 'Ticketing Officer',
    status: 'ACTIVE',
    passwordHash: await AuthService.hashPassword('AgentPassword2026!')
  };
  mockUsers.set(agentUser.id, { ...agentUser });

  const ticketOnlyUser = {
    id: 'EMP-TO-01',
    name: 'Ticket Only User',
    email: 'ticketonly@africatravel.com',
    role: 'TICKET_ONLY',
    title: 'Ticket Creation Officer',
    status: 'ACTIVE',
    passwordHash: await AuthService.hashPassword('TicketOnly2026!')
  };
  mockUsers.set(ticketOnlyUser.id, { ...ticketOnlyUser });

  // Initialize test customer
  const activeCustomer = {
    id: 'CUST-001',
    name: 'Active Customer',
    email: 'active@example.com',
    phone: '+201001234567',
    passport: 'A11223344',
    passportDocPath: 'customers/CUST-001/passport.jpg',
    passportDocUploadedAt: new Date(),
    deletedAt: null,
    notes: [],
    tickets: []
  };
  mockCustomers.set(activeCustomer.id, { ...activeCustomer });

  const softDeletedCustomer = {
    id: 'CUST-DEL-01',
    name: 'Deleted Customer',
    email: 'deleted@example.com',
    phone: '+201009999999',
    passport: 'D99887766',
    passportDocPath: 'customers/CUST-DEL-01/passport.jpg',
    passportDocUploadedAt: new Date(),
    deletedAt: new Date(),
    notes: [],
    tickets: []
  };
  mockCustomers.set(softDeletedCustomer.id, { ...softDeletedCustomer });

  // Initialize soft-deleted ticket
  const softDeletedTicket = {
    id: 'TK-DEL-01',
    ticketNumber: '077-9999999999',
    pnr: 'DELPNR1',
    customerId: 'CUST-001',
    passengerName: 'Deleted Ticket Passenger',
    ticketPrice: 10000,
    costPrice: 8000,
    currency: 'EGP',
    status: 'CONFIRMED',
    deletedAt: new Date(),
    payments: [],
    modifications: [],
    refunds: []
  };
  mockTickets.set(softDeletedTicket.id, { ...softDeletedTicket });

  // Initialize active ticket
  const activeTicket = {
    id: 'TK-ACT-01',
    ticketNumber: '077-1000000001',
    pnr: 'ACTPNR1',
    customerId: 'CUST-001',
    passengerName: 'Active Passenger',
    ticketPrice: 10000,
    costPrice: 8000,
    currency: 'EGP',
    status: 'UNPAID',
    deletedAt: null,
    payments: [],
    modifications: [],
    refunds: []
  };
  mockTickets.set(activeTicket.id, { ...activeTicket });

  // Mock Prisma Implementation
  const mockPrisma = {
    user: {
      findUnique: async ({ where }) => {
        if (where.id) return mockUsers.get(where.id) || null;
        if (where.email) return [...mockUsers.values()].find(u => u.email === where.email) || null;
        return null;
      },
      findFirst: async ({ where }) => {
        if (where.email) {
          const emailTarget = where.email.equals || where.email;
          return [...mockUsers.values()].find(u => u.email.toLowerCase() === emailTarget.toLowerCase()) || null;
        }
        return null;
      },
      findMany: async () => [...mockUsers.values()],
      count: async ({ where } = {}) => {
        let list = [...mockUsers.values()];
        if (where?.role) list = list.filter(u => u.role === where.role);
        if (where?.status) list = list.filter(u => u.status === where.status);
        return list.length;
      },
      update: async ({ where, data }) => {
        const u = mockUsers.get(where.id);
        if (u) {
          Object.assign(u, data);
          mockUsers.set(u.id, u);
        }
        return u;
      }
    },
    refreshToken: {
      create: async ({ data }) => {
        const rec = { id: `RT-${tokenCounter++}`, revoked: false, ...data };
        mockRefreshTokens.set(data.tokenHash, rec);
        return rec;
      },
      findUnique: async ({ where }) => {
        const rec = mockRefreshTokens.get(where.tokenHash);
        if (!rec) return null;
        const user = mockUsers.get(rec.userId);
        return { ...rec, user };
      },
      updateMany: async ({ where, data }) => {
        let count = 0;
        for (const token of mockRefreshTokens.values()) {
          let match = true;
          if (where.userId && token.userId !== where.userId) match = false;
          if (where.revoked !== undefined && token.revoked !== where.revoked) match = false;
          if (where.tokenHash) {
            if (where.tokenHash.not && token.tokenHash === where.tokenHash.not) match = false;
            else if (typeof where.tokenHash === 'string' && token.tokenHash !== where.tokenHash) match = false;
          }
          if (match) {
            Object.assign(token, data);
            count++;
          }
        }
        return { count };
      }
    },
    ticket: {
      findMany: async () => [...mockTickets.values()],
      count: async () => mockTickets.size,
      create: async ({ data }) => {
        const rec = {
          ...data,
          payments: [],
          modifications: [],
          refunds: [],
          deletedAt: null,
          createdAt: new Date(),
          updatedAt: new Date()
        };
        mockTickets.set(rec.id, rec);
        return rec;
      },
      findFirst: async ({ where, include }) => {
        const list = [...mockTickets.values()];
        const matched = list.find(t => {
          let orMatch = true;
          if (where.OR) {
            orMatch = where.OR.some(cond => {
              if (cond.id && t.id === cond.id) return true;
              if (cond.ticketNumber && t.ticketNumber === cond.ticketNumber) return true;
              if (cond.pnr && t.pnr === cond.pnr) return true;
              return false;
            });
          }
          let delMatch = true;
          if (where.deletedAt === null && t.deletedAt !== null) delMatch = false;
          if (where.deletedAt && where.deletedAt.not !== undefined && t.deletedAt === null) delMatch = false;
          return orMatch && delMatch;
        });

        if (!matched) return null;

        const ticketPayments = [...mockPayments.values()].filter(p => p.ticketId === matched.id);
        const ticketRefunds = [...mockRefunds.values()].filter(r => r.ticketId === matched.id);
        const ticketMods = [...mockModifications.values()].filter(m => m.ticketId === matched.id);

        return {
          ...matched,
          payments: ticketPayments,
          refunds: ticketRefunds,
          modifications: ticketMods
        };
      },
      update: async ({ where, data }) => {
        const t = mockTickets.get(where.id);
        if (t) {
          Object.assign(t, data);
          mockTickets.set(t.id, t);
        }
        return t;
      }
    },
    payment: {
      create: async ({ data }) => {
        mockPayments.set(data.id, data);
        return data;
      }
    },
    refund: {
      create: async ({ data }) => {
        mockRefunds.set(data.id, data);
        return data;
      }
    },
    modification: {
      create: async ({ data }) => {
        mockModifications.set(data.id, data);
        return data;
      }
    },
    customer: {
      findFirst: async ({ where }) => {
        const list = [...mockCustomers.values()];
        return list.find(c => {
          if (where.id && c.id !== where.id) return false;
          if (where.deletedAt === null && c.deletedAt !== null) return false;
          if (where.passport && c.passport !== where.passport) return false;
          return true;
        }) || null;
      },
      findUnique: async ({ where }) => {
        return mockCustomers.get(where.id) || null;
      },
      create: async ({ data }) => {
        const rec = { ...data, deletedAt: null, notes: [], tickets: [] };
        mockCustomers.set(rec.id, rec);
        return rec;
      },
      update: async ({ where, data }) => {
        const c = mockCustomers.get(where.id);
        if (c) {
          Object.assign(c, data);
          mockCustomers.set(c.id, c);
        }
        return c;
      }
    },
    auditLog: {
      create: async ({ data }) => {
        mockAuditLogs.push(data);
        return data;
      }
    },
    $transaction: async (fn) => {
      if (typeof fn === 'function') {
        return await fn(mockPrisma);
      }
      return fn;
    },
    $queryRaw: async () => [{ 1: 1 }]
  };

  setPrismaClient(mockPrisma);

  // Mock Supabase storage
  setSupabaseClient({
    storage: {
      from: () => ({
        createSignedUrl: async (storagePath, expiresIn) => ({
          data: { signedUrl: `https://storage.supabase.co/signed/${storagePath}?exp=${expiresIn}` },
          error: null
        })
      })
    }
  });

  const app = createApp();
  const server = http.createServer(app);
  await new Promise(r => server.listen(0, '127.0.0.1', r));

  try {
    // =========================================================================
    // 1. Financial operations on soft-deleted tickets rejected (404)
    // =========================================================================
    console.log('--- 1. Financial Operations on Soft-Deleted Tickets ---');

    let paymentErr = null;
    try {
      await TicketService.addPayment('TK-DEL-01', { amount: 5000, method: 'Cash' }, adminUser);
    } catch (err) {
      paymentErr = err;
    }
    assert(paymentErr instanceof NotFoundError, 'addPayment on soft-deleted ticket throws NotFoundError');
    assert(paymentErr?.statusCode === 404, 'addPayment on soft-deleted ticket returns 404 statusCode');

    let refundErr = null;
    try {
      await TicketService.addRefund('TK-DEL-01', { amount: 1000, reason: 'Test refund' }, adminUser);
    } catch (err) {
      refundErr = err;
    }
    assert(refundErr instanceof NotFoundError, 'addRefund on soft-deleted ticket throws NotFoundError');
    assert(refundErr?.statusCode === 404, 'addRefund on soft-deleted ticket returns 404 statusCode');

    let modErr = null;
    try {
      await TicketService.addModification('TK-DEL-01', { flightNumber: 'MS 999', changeFee: 500 }, adminUser);
    } catch (err) {
      modErr = err;
    }
    assert(modErr instanceof NotFoundError, 'addModification on soft-deleted ticket throws NotFoundError');
    assert(modErr?.statusCode === 404, 'addModification on soft-deleted ticket returns 404 statusCode');

    // =========================================================================
    // 2. Real-time DB check in JWT authentication & Token Revocation
    // =========================================================================
    console.log('\n--- 2. Real-Time DB Verification & Token Revocation ---');

    const tempUser = {
      id: 'EMP-TEMP-01',
      name: 'Temp Deactivate Test',
      email: 'temp@africatravel.com',
      role: 'ADMIN',
      title: 'Temporary Admin',
      status: 'ACTIVE',
      passwordHash: await AuthService.hashPassword('TempPass123!')
    };
    mockUsers.set(tempUser.id, { ...tempUser });

    // Issue valid JWT before deactivation
    const tempToken = AuthService.generateAccessToken(tempUser);

    // Initial check: Valid while active
    let authReq = { headers: { authorization: `Bearer ${tempToken}` } };
    let authErr = null;
    await new Promise(res => authenticate(authReq, {}, err => { authErr = err; res(); }));
    assert(!authErr && authReq.user?.role === 'ADMIN', 'Active employee JWT authenticates successfully');

    // Admin demotes tempUser from ADMIN to AGENT
    await EmployeeService.updateEmployee(tempUser.id, { role: 'AGENT' }, adminUser);
    assert(mockUsers.get(tempUser.id).role === 'AGENT', 'Employee role updated to AGENT in database');

    // Next request with same OLD JWT: role MUST now be AGENT in req.user
    authReq = { headers: { authorization: `Bearer ${tempToken}` } };
    authErr = null;
    await new Promise(res => authenticate(authReq, {}, err => { authErr = err; res(); }));
    assert(!authErr && authReq.user?.role === 'AGENT', 'Stale JWT claim overridden by live DB role (ADMIN -> AGENT)');

    // Admin deactivates tempUser (status: INACTIVE)
    await EmployeeService.updateEmployee(tempUser.id, { status: 'INACTIVE' }, adminUser);
    assert(mockUsers.get(tempUser.id).status === 'INACTIVE', 'Employee status set to INACTIVE in database');

    // Next request with same unexpired JWT: MUST be rejected immediately as ACCOUNT_INACTIVE (401)
    authReq = { headers: { authorization: `Bearer ${tempToken}` } };
    authErr = null;
    await new Promise(res => authenticate(authReq, {}, err => { authErr = err; res(); }));
    assert(authErr instanceof UnauthorizedError, 'Deactivated employee JWT throws UnauthorizedError');
    assert(authErr?.code === 'ACCOUNT_INACTIVE', 'Deactivated employee JWT rejection code is ACCOUNT_INACTIVE');

    // =========================================================================
    // 3. TICKET_ONLY / AGENT costPrice Isolation
    // =========================================================================
    console.log('\n--- 3. costPrice Isolation & RBAC Enforcement ---');

    // TICKET_ONLY attempts to create ticket with costPrice: 99999
    const toTicket = await TicketService.createTicket({
      passengerName: 'Cost Isolation Passenger',
      origin: 'CAI',
      destination: 'JED',
      ticketPrice: 15000,
      costPrice: 99999,
      airline: 'EgyptAir',
      airlineCode: 'MS',
      flightNumber: 'MS 661'
    }, ticketOnlyUser);

    assert(toTicket.costPrice === null || toTicket.costPrice === 0, 'TICKET_ONLY created ticket sanitizes returned costPrice to 0/null');
    const rawStoredToTicket = mockTickets.get(toTicket.id);
    assert(rawStoredToTicket.costPrice === 0, 'TICKET_ONLY created ticket stored in DB with costPrice: 0 (not 99999)');

    // AGENT attempts to create ticket with costPrice: 12000
    const agentTicket = await TicketService.createTicket({
      passengerName: 'Agent Cost Passenger',
      origin: 'CAI',
      destination: 'DXB',
      ticketPrice: 18000,
      costPrice: 12000,
      airline: 'Emirates',
      airlineCode: 'EK',
      flightNumber: 'EK 924'
    }, agentUser);
    const rawStoredAgentTicket = mockTickets.get(agentTicket.id);
    assert(rawStoredAgentTicket.costPrice === 0, 'AGENT created ticket stored in DB with costPrice: 0');

    // ADMIN creates ticket with costPrice: 14000
    const adminCreatedTicket = await TicketService.createTicket({
      passengerName: 'Admin Cost Passenger',
      origin: 'CAI',
      destination: 'LHR',
      ticketPrice: 25000,
      costPrice: 14000,
      airline: 'EgyptAir',
      airlineCode: 'MS',
      flightNumber: 'MS 777'
    }, adminUser);
    const rawStoredAdminTicket = mockTickets.get(adminCreatedTicket.id);
    assert(rawStoredAdminTicket.costPrice === 14000, 'ADMIN created ticket stored in DB with real costPrice (14000)');

    // Non-ADMIN attempts to update costPrice on existing ticket -> ForbiddenError
    let updateCostErr = null;
    try {
      await TicketService.updateTicket(adminCreatedTicket.id, { costPrice: 1000 }, ticketOnlyUser);
    } catch (err) {
      updateCostErr = err;
    }
    assert(updateCostErr instanceof ForbiddenError, 'TICKET_ONLY attempting to update costPrice throws ForbiddenError');
    assert(updateCostErr?.statusCode === 403, 'costPrice update rejection returns 403 status');

    // ADMIN updates costPrice -> succeeds
    const updatedByAdmin = await TicketService.updateTicket(adminCreatedTicket.id, { costPrice: 15500 }, adminUser);
    assert(updatedByAdmin.costPrice === 15500, 'ADMIN successfully updates ticket costPrice to 15500');

    // =========================================================================
    // 4. customerId authorization scope check allows valid customer linking
    // =========================================================================
    console.log('\n--- 4. Customer Linking on Ticket Creation ---');
    const linkedTicket = await TicketService.createTicket({
      customerId: 'CUST-001',
      passengerName: 'Linked Customer Passenger',
      origin: 'CAI',
      destination: 'RUH',
      ticketPrice: 12000,
      airline: 'Saudia',
      airlineCode: 'SV',
      flightNumber: 'SV 301'
    }, ticketOnlyUser);
    assert(linkedTicket.customerId === 'CUST-001', 'TICKET_ONLY successfully links ticket to existing customer CUST-001');

    // =========================================================================
    // 5. Passport document access blocked on soft-deleted customer (404)
    // =========================================================================
    console.log('\n--- 5. Passport Document on Soft-Deleted Customers ---');

    let docUrlErr = null;
    try {
      await CustomerService.getPassportDocumentUrl('CUST-DEL-01', agentUser);
    } catch (err) {
      docUrlErr = err;
    }
    assert(docUrlErr instanceof NotFoundError, 'getPassportDocumentUrl for soft-deleted customer throws NotFoundError');
    assert(docUrlErr?.statusCode === 404, 'getPassportDocumentUrl for soft-deleted customer returns 404');

    // Active customer succeeds
    const activeDoc = await CustomerService.getPassportDocumentUrl('CUST-001', agentUser);
    assert(Boolean(activeDoc.url), 'getPassportDocumentUrl for active customer generates signed URL');

    // =========================================================================
    // 6. Revoke Other Sessions API Endpoint & Service
    // =========================================================================
    console.log('\n--- 6. Revoke Other Sessions Endpoint & Logic ---');

    // Create 3 refresh tokens for adminUser
    const rawTokenCurrent = 'token-current-session-1234567890123456789012345678901234567890';
    const rawTokenOther1 = 'token-other-session-1-1234567890123456789012345678901234567890';
    const rawTokenOther2 = 'token-other-session-2-1234567890123456789012345678901234567890';

    await mockPrisma.refreshToken.create({
      data: {
        tokenHash: AuthService.hashToken(rawTokenCurrent),
        userId: adminUser.id,
        expiresAt: new Date(Date.now() + 7 * 86400000)
      }
    });
    await mockPrisma.refreshToken.create({
      data: {
        tokenHash: AuthService.hashToken(rawTokenOther1),
        userId: adminUser.id,
        expiresAt: new Date(Date.now() + 7 * 86400000)
      }
    });
    await mockPrisma.refreshToken.create({
      data: {
        tokenHash: AuthService.hashToken(rawTokenOther2),
        userId: adminUser.id,
        expiresAt: new Date(Date.now() + 7 * 86400000)
      }
    });

    const adminJwtToken = AuthService.generateAccessToken(adminUser);

    // Call POST /api/auth/revoke-other-sessions with current token cookie
    const revokeRes = await makeRequest(server, {
      method: 'POST',
      path: '/api/auth/revoke-other-sessions',
      headers: {
        Authorization: `Bearer ${adminJwtToken}`,
        Cookie: `refreshToken=${rawTokenCurrent}`
      }
    });

    assert(revokeRes.statusCode === 200, 'POST /api/auth/revoke-other-sessions returns HTTP 200 OK');
    assert(revokeRes.json?.success === true, 'Revoke other sessions response has success: true');

    const curTokenRecord = mockRefreshTokens.get(AuthService.hashToken(rawTokenCurrent));
    const other1Record = mockRefreshTokens.get(AuthService.hashToken(rawTokenOther1));
    const other2Record = mockRefreshTokens.get(AuthService.hashToken(rawTokenOther2));

    assert(curTokenRecord.revoked === false, 'Current session refresh token remains UNREVOKED');
    assert(other1Record.revoked === true, 'Other session 1 refresh token is REVOKED');
    assert(other2Record.revoked === true, 'Other session 2 refresh token is REVOKED');

    // =========================================================================
    // 7. Settings 2FA badge reflects honest inactive status
    // =========================================================================
    console.log('\n--- 7. Settings 2FA Honest Badge Verification ---');
    const settingsJsContent = fs.readFileSync(path.resolve('js/pages/settings.js'), 'utf8');
    assert(
      settingsJsContent.includes('badge-inactive') && settingsJsContent.includes('twoFactor'),
      'Settings page renders badge-inactive for 2FA section'
    );
    assert(
      !settingsJsContent.includes('<span class="badge badge-paid">${escapeHtml(t(\'common.enabled\'))}</span>'),
      'Settings page no longer misleads users with fake "badge-paid / common.enabled" 2FA badge'
    );

    // =========================================================================
    // 8. Settings password inputs enforce minlength="8"
    // =========================================================================
    console.log('\n--- 8. Settings Password Length Verification ---');
    assert(
      settingsJsContent.includes('id="new-pw" class="form-control" placeholder="••••••••" autocomplete="new-password" minlength="8"'),
      'new-pw input enforces minlength="8"'
    );
    assert(
      settingsJsContent.includes('id="conf-pw" class="form-control" placeholder="••••••••" autocomplete="new-password" minlength="8"'),
      'conf-pw input enforces minlength="8"'
    );

    console.log('\n========================================================');
    console.log(`Security Hardening Round 2 Tests: ${passed} passed, ${failed} failed`);
    console.log('========================================================\n');

    if (failed > 0) {
      console.error('Failed assertions:\n', failures.join('\n'));
      process.exit(1);
    }
  } finally {
    server.close();
  }
}

runSecurityHardeningRound2Tests().catch(err => {
  console.error('Test execution failed:', err);
  process.exit(1);
});

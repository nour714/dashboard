/**
 * AfricaTravel - Final Production Hardening Test Suite
 *
 * Tests all hardening requirements:
 * 1. Refresh endpoint rate limiting, body rejection, and cookie handling
 * 2. Passport uniqueness, duplicate rejection (409), null handling
 * 3. PNR uniqueness, duplicate rejection (409), multiple nulls allowed
 * 4. Ticket updates: pnr, ticketNumber, clearing date fields, tripType, cabinClass
 * 5. Error handling: Prisma P2002 -> 409 Conflict, P2025 -> 404 Not Found
 */

import http from 'http';
import jwt from 'jsonwebtoken';
import { createApp } from '../server/src/app.js';
import { env } from '../server/src/config/env.js';
import { setPrismaClient } from '../server/src/config/database.js';
import { CustomerService } from '../server/src/services/customer.service.js';
import { TicketService } from '../server/src/services/ticket.service.js';
import { AuthService } from '../server/src/services/auth.service.js';
import { errorHandler } from '../server/src/middleware/error-handler.js';

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
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        let json = null;
        try {
          json = JSON.parse(data);
        } catch (_) {
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

async function runHardeningTests() {
  console.log('\n🛡️  ========================================================');
  console.log('   AfricaTravel Production Hardening Tests');
  console.log('========================================================\n');

  // Set up in-memory mock Prisma
  const mockCustomers = [];
  const mockTickets = [];
  const mockTokens = new Map();
  let tokenCounter = 1;

  const adminPasswordHash = await AuthService.hashPassword('Password123!');
  const mockAdminUser = {
    id: 'EMP-HARDEN-1',
    name: 'Hardening Admin',
    email: 'admin@africatravel.com',
    role: 'ADMIN',
    title: 'Security Lead',
    status: 'ACTIVE',
    passwordHash: adminPasswordHash
  };

  const mockPrisma = {
    user: {
      findFirst: async ({ where }) => {
        if (where?.email?.equals?.toLowerCase() === mockAdminUser.email.toLowerCase() || where?.email === mockAdminUser.email) {
          return mockAdminUser;
        }
        return null;
      },
      findUnique: async ({ where }) => {
        if (where?.id === mockAdminUser.id) return mockAdminUser;
        return null;
      },
      update: async ({ data }) => {
        Object.assign(mockAdminUser, data);
        return mockAdminUser;
      }
    },
    customer: {
      findFirst: async ({ where }) => {
        return mockCustomers.find(c => {
          if (where?.deletedAt !== undefined && c.deletedAt !== where.deletedAt) return false;
          if (where?.id?.not && c.id === where.id.not) return false;
          if (where?.passport?.equals) {
            return c.passport && c.passport.toLowerCase() === where.passport.equals.toLowerCase();
          }
          if (where?.passport) {
            return c.passport && c.passport.toLowerCase() === where.passport.toLowerCase();
          }
          if (where?.email) {
            return c.email && c.email.toLowerCase() === where.email.toLowerCase();
          }
          return true;
        }) || null;
      },
      findUnique: async ({ where }) => {
        return mockCustomers.find(c => c.id === where.id) || null;
      },
      findMany: async ({ where } = {}) => {
        return mockCustomers.filter(c => !where?.deletedAt || c.deletedAt === where.deletedAt);
      },
      count: async () => mockCustomers.length,
      create: async ({ data }) => {
        if (data.passport) {
          const exists = mockCustomers.find(c => c.passport === data.passport && !c.deletedAt);
          if (exists) {
            const err = new Error('Unique constraint failed on the fields: (passport)');
            err.code = 'P2002';
            err.meta = { target: ['passport'] };
            throw err;
          }
        }
        const record = { ...data, deletedAt: null, createdAt: new Date(), updatedAt: new Date(), notes: [] };
        mockCustomers.push(record);
        return record;
      },
      update: async ({ where, data }) => {
        const cust = mockCustomers.find(c => c.id === where.id);
        if (!cust) {
          const err = new Error('Record to update not found.');
          err.code = 'P2025';
          err.meta = { cause: 'Customer not found' };
          throw err;
        }
        if (data.passport && data.passport !== cust.passport) {
          const exists = mockCustomers.find(c => c.id !== cust.id && c.passport === data.passport && !c.deletedAt);
          if (exists) {
            const err = new Error('Unique constraint failed on the fields: (passport)');
            err.code = 'P2002';
            err.meta = { target: ['passport'] };
            throw err;
          }
        }
        Object.assign(cust, data, { updatedAt: new Date() });
        return cust;
      }
    },
    ticket: {
      findFirst: async ({ where }) => {
        return mockTickets.find(t => {
          if (where?.deletedAt !== undefined && t.deletedAt !== where.deletedAt) return false;
          if (where?.id?.not && t.id === where.id.not) return false;
          if (where?.pnr && t.pnr === where.pnr) return true;
          if (where?.ticketNumber && t.ticketNumber === where.ticketNumber) return true;
          if (where?.OR) {
            return where.OR.some(cond => {
              if (cond.id && t.id === cond.id) return true;
              if (cond.ticketNumber && t.ticketNumber === cond.ticketNumber) return true;
              if (cond.pnr && t.pnr === cond.pnr) return true;
              return false;
            });
          }
          return false;
        }) || null;
      },
      findMany: async () => mockTickets.filter(t => !t.deletedAt),
      count: async () => mockTickets.filter(t => !t.deletedAt).length,
      create: async ({ data }) => {
        if (data.pnr) {
          const exists = mockTickets.find(t => t.pnr === data.pnr && !t.deletedAt);
          if (exists) {
            const err = new Error('Unique constraint failed on the fields: (pnr)');
            err.code = 'P2002';
            err.meta = { target: ['pnr'] };
            throw err;
          }
        }
        if (data.ticketNumber) {
          const exists = mockTickets.find(t => t.ticketNumber === data.ticketNumber && !t.deletedAt);
          if (exists) {
            const err = new Error('Unique constraint failed on the fields: (ticketNumber)');
            err.code = 'P2002';
            err.meta = { target: ['ticketNumber'] };
            throw err;
          }
        }
        const record = {
          ...data,
          payments: [],
          modifications: [],
          refunds: [],
          deletedAt: null,
          createdAt: new Date(),
          updatedAt: new Date()
        };
        mockTickets.push(record);
        return record;
      },
      update: async ({ where, data }) => {
        const ticket = mockTickets.find(t => t.id === where.id);
        if (!ticket) {
          const err = new Error('Record to update not found.');
          err.code = 'P2025';
          err.meta = { cause: 'Ticket not found' };
          throw err;
        }
        if (data.pnr && data.pnr !== ticket.pnr) {
          const exists = mockTickets.find(t => t.id !== ticket.id && t.pnr === data.pnr && !t.deletedAt);
          if (exists) {
            const err = new Error('Unique constraint failed on the fields: (pnr)');
            err.code = 'P2002';
            err.meta = { target: ['pnr'] };
            throw err;
          }
        }
        if (data.ticketNumber && data.ticketNumber !== ticket.ticketNumber) {
          const exists = mockTickets.find(t => t.id !== ticket.id && t.ticketNumber === data.ticketNumber && !t.deletedAt);
          if (exists) {
            const err = new Error('Unique constraint failed on the fields: (ticketNumber)');
            err.code = 'P2002';
            err.meta = { target: ['ticketNumber'] };
            throw err;
          }
        }
        Object.assign(ticket, data, { updatedAt: new Date() });
        return ticket;
      }
    },
    refreshToken: {
      create: async ({ data }) => {
        const record = { id: `token-${tokenCounter++}`, revoked: false, ...data };
        mockTokens.set(data.tokenHash, record);
        return record;
      },
      findUnique: async ({ where }) => {
        const record = mockTokens.get(where.tokenHash);
        if (!record) return null;
        return { ...record, user: mockAdminUser };
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
      }
    },
    auditLog: {
      create: async () => ({})
    },
    $queryRaw: async () => [{ 1: 1 }],
    $transaction: async (arg) => {
      if (typeof arg === 'function') return await arg(mockPrisma);
      return arg;
    }
  };

  setPrismaClient(mockPrisma);

  const app = createApp();
  const server = http.createServer(app);
  await new Promise(r => server.listen(0, '127.0.0.1', r));

  try {
    // ══════════════════════════════════════════════════════════════
    // SECTION 1: Refresh Token Hardening & Schema Validation
    // ══════════════════════════════════════════════════════════════
    console.log('--- 1. Refresh Token Endpoint Hardening ---');

    // 1.1: Body containing refreshToken must be rejected with 400
    const bodyRejectionRes = await makeRequest(server, {
      method: 'POST',
      path: '/api/auth/refresh',
      body: { refreshToken: 'malicious_body_token_attempt' }
    });
    assert(bodyRejectionRes.statusCode === 400, 'POST /api/auth/refresh rejects body containing refreshToken with 400 Bad Request');
    assert(bodyRejectionRes.json?.success === false, 'Rejection response indicates success: false');

    // 1.2: Obtain a valid session via login
    const loginRes = await makeRequest(server, {
      method: 'POST',
      path: '/api/auth/login',
      body: { email: 'admin@africatravel.com', password: 'Password123!', rememberMe: true }
    });
    assert(loginRes.statusCode === 200, 'POST /api/auth/login succeeds');
    const setCookie = loginRes.headers['set-cookie']?.[0] || '';
    const cookieHeader = setCookie.split(';')[0]; // "refreshToken=..."

    // 1.3: Refresh through cookie succeeds with 200 OK
    const cookieRefreshRes = await makeRequest(server, {
      method: 'POST',
      path: '/api/auth/refresh',
      headers: { Cookie: cookieHeader },
      body: {}
    });
    assert(cookieRefreshRes.statusCode === 200, 'POST /api/auth/refresh with httpOnly cookie and empty body returns 200 OK');
    assert(cookieRefreshRes.json?.success === true, 'Refresh response has success: true');
    assert(typeof cookieRefreshRes.json?.data?.accessToken === 'string', 'Refresh response returns fresh accessToken');

    // 1.4: Rate Limiter on /api/auth/refresh
    console.log('--- 2. Refresh Token Rate Limiter ---');
    let rateLimited = false;
    // The refresh limiter window is 30 max requests.
    // Send 35 requests to verify that 429 is reached
    for (let i = 0; i < 35; i++) {
      const res = await makeRequest(server, {
        method: 'POST',
        path: '/api/auth/refresh',
        headers: { Cookie: 'refreshToken=dummy_token_for_rate_test' }
      });
      if (res.statusCode === 429) {
        rateLimited = true;
        assert(res.json?.error?.code === 'RATE_LIMIT_EXCEEDED', '429 response contains code RATE_LIMIT_EXCEEDED');
        break;
      }
    }
    assert(rateLimited, 'POST /api/auth/refresh triggers 429 Too Many Requests when rate limit exceeded');

    // ══════════════════════════════════════════════════════════════
    // SECTION 2: Passport Uniqueness Hardening
    // ══════════════════════════════════════════════════════════════
    console.log('\n--- 3. Passport Uniqueness & Duplicate Handling ---');

    // 2.1: First customer with passport created successfully
    const cust1 = await CustomerService.createCustomer({
      name: 'Ahmed Mostafa',
      passport: 'A99887766',
      nationality: 'Egyptian (EGY)'
    }, { name: 'Admin', id: 'EMP-1' });
    assert(cust1 && cust1.passport === 'A99887766', 'First customer with passport A99887766 created successfully');

    // 2.2: Duplicate passport rejected with 409 Conflict
    let dupCustError = null;
    try {
      await CustomerService.createCustomer({
        name: 'Tamer Mostafa',
        passport: 'A99887766',
        nationality: 'Egyptian (EGY)'
      }, { name: 'Admin', id: 'EMP-1' });
    } catch (err) {
      dupCustError = err;
    }
    assert(dupCustError !== null, 'Creating customer with duplicate passport throws error');
    assert(dupCustError?.statusCode === 409, 'Duplicate passport throws 409 Conflict');
    assert(dupCustError?.message === 'Passport number already exists', 'Duplicate passport error message is "Passport number already exists"');

    // 2.3: Existing customer data remains intact
    const allCustomers = await CustomerService.getCustomers();
    assert(allCustomers.length === 1, 'Customer count remains 1 (duplicate not inserted)');
    assert(allCustomers[0].name === 'Ahmed Mostafa', 'Original customer data intact');

    // 2.4: Multiple customers with NULL passport allowed
    const custNoPassport1 = await CustomerService.createCustomer({
      name: 'Customer Without Passport 1'
    }, { name: 'Admin', id: 'EMP-1' });
    const custNoPassport2 = await CustomerService.createCustomer({
      name: 'Customer Without Passport 2'
    }, { name: 'Admin', id: 'EMP-1' });
    assert(custNoPassport1.id && custNoPassport2.id, 'Multiple customers with NULL passport created without conflict');

    // ══════════════════════════════════════════════════════════════
    // SECTION 3: PNR Uniqueness Hardening
    // ══════════════════════════════════════════════════════════════
    console.log('\n--- 4. PNR Uniqueness & Duplicate Handling ---');

    // 3.1: First ticket with unique PNR created successfully
    const ticket1 = await TicketService.createTicket({
      pnr: 'UNIQUE1',
      ticketNumber: '077-1000000001',
      passengerName: 'Kareem Fahmy',
      airline: 'EgyptAir',
      airlineCode: 'MS',
      origin: 'CAI',
      destination: 'DXB',
      ticketPrice: 5000,
      customerId: cust1.id
    }, { name: 'Admin', id: 'EMP-1' });
    assert(ticket1 && ticket1.pnr === 'UNIQUE1', 'First ticket with PNR UNIQUE1 created successfully');

    // 3.2: Duplicate PNR rejected with 409 Conflict
    let dupPnrError = null;
    try {
      await TicketService.createTicket({
        pnr: 'UNIQUE1',
        ticketNumber: '077-1000000002',
        passengerName: 'Another Passenger',
        airline: 'EgyptAir',
        airlineCode: 'MS',
        origin: 'CAI',
        destination: 'DXB',
        ticketPrice: 6000,
        customerId: cust1.id
      }, { name: 'Admin', id: 'EMP-1' });
    } catch (err) {
      dupPnrError = err;
    }
    assert(dupPnrError !== null, 'Creating ticket with duplicate PNR throws error');
    assert(dupPnrError?.statusCode === 409, 'Duplicate PNR throws 409 Conflict');
    assert(dupPnrError?.message === 'PNR already exists', 'Duplicate PNR error message is "PNR already exists"');

    // 3.3: Multiple tickets with NULL / generated PNR allowed
    const ticket2 = await TicketService.createTicket({
      passengerName: 'Auto PNR Passenger',
      airline: 'EgyptAir',
      airlineCode: 'MS',
      origin: 'CAI',
      destination: 'JED',
      ticketPrice: 4000,
      customerId: cust1.id
    }, { name: 'Admin', id: 'EMP-1' });
    assert(ticket2 && ticket2.id, 'Ticket with auto-generated PNR created without conflict');

    // ══════════════════════════════════════════════════════════════
    // SECTION 4: Ticket Update Service & Date Clearing Logic
    // ══════════════════════════════════════════════════════════════
    console.log('\n--- 5. Ticket Update Service & Date Clearing ---');

    // 4.1: Update pnr and ticketNumber
    const updatedPnrTicket = await TicketService.updateTicket(ticket1.id, {
      pnr: 'NEWPNR9',
      ticketNumber: '077-9999999999'
    }, { name: 'Admin', id: 'EMP-1' });
    assert(updatedPnrTicket.pnr === 'NEWPNR9', 'Ticket PNR updated to NEWPNR9');
    assert(updatedPnrTicket.ticketNumber === '077-9999999999', 'Ticket ticketNumber updated');

    // 4.2: Update tripType and cabinClass
    const updatedClassTicket = await TicketService.updateTicket(ticket1.id, {
      tripType: 'Round Trip',
      cabinClass: 'Business (J)'
    }, { name: 'Admin', id: 'EMP-1' });
    assert(updatedClassTicket.tripType === 'Round Trip', 'tripType updated to "Round Trip"');
    assert(updatedClassTicket.cabinClass === 'Business (J)', 'cabinClass updated to "Business (J)"');

    // 4.3: Set dates initially
    await TicketService.updateTicket(ticket1.id, {
      departureDate: '2026-10-15T10:00:00.000Z',
      arrivalDate: '2026-10-15T14:00:00.000Z',
      returnDepartureDate: '2026-10-25T10:00:00.000Z',
      returnArrivalDate: '2026-10-25T14:00:00.000Z'
    }, { name: 'Admin', id: 'EMP-1' });

    // 4.4: Clear departureDate using null
    const clearedDeparture = await TicketService.updateTicket(ticket1.id, {
      departureDate: null
    }, { name: 'Admin', id: 'EMP-1' });
    assert(clearedDeparture.departureDate === null, 'departureDate cleared via null');

    // 4.5: Clear arrivalDate using empty string ''
    const clearedArrival = await TicketService.updateTicket(ticket1.id, {
      arrivalDate: ''
    }, { name: 'Admin', id: 'EMP-1' });
    assert(clearedArrival.arrivalDate === null, 'arrivalDate cleared via empty string');

    // 4.6: Clear returnDepartureDate and returnArrivalDate using null
    const clearedReturn = await TicketService.updateTicket(ticket1.id, {
      returnDepartureDate: null,
      returnArrivalDate: null
    }, { name: 'Admin', id: 'EMP-1' });
    assert(clearedReturn.returnDepartureDate === null, 'returnDepartureDate cleared via null');
    assert(clearedReturn.returnArrivalDate === null, 'returnArrivalDate cleared via null');

    // ══════════════════════════════════════════════════════════════
    // SECTION 5: Centralized Error Handler (P2002 & P2025)
    // ══════════════════════════════════════════════════════════════
    console.log('\n--- 6. Centralized Error Handling (P2002 & P2025) ---');

    // 5.1: Test errorHandler on P2002 (Passport)
    let p2002Status = null;
    let p2002Body = null;
    const mockResP2002 = {
      status(code) { p2002Status = code; return this; },
      json(body) { p2002Body = body; return this; }
    };
    const p2002ErrPassport = new Error('Unique constraint failed');
    p2002ErrPassport.code = 'P2002';
    p2002ErrPassport.meta = { target: ['passport'] };
    errorHandler(p2002ErrPassport, {}, mockResP2002, () => {});

    assert(p2002Status === 409, 'P2002 on passport returns HTTP 409 Conflict');
    assert(p2002Body?.success === false, 'P2002 response has success: false');
    assert(p2002Body?.message === 'Passport number already exists', 'P2002 passport error message is "Passport number already exists"');

    // 5.2: Test errorHandler on P2002 (PNR)
    let p2002PnrStatus = null;
    let p2002PnrBody = null;
    const mockResP2002Pnr = {
      status(code) { p2002PnrStatus = code; return this; },
      json(body) { p2002PnrBody = body; return this; }
    };
    const p2002ErrPnr = new Error('Unique constraint failed');
    p2002ErrPnr.code = 'P2002';
    p2002ErrPnr.meta = { target: ['pnr'] };
    errorHandler(p2002ErrPnr, {}, mockResP2002Pnr, () => {});

    assert(p2002PnrStatus === 409, 'P2002 on pnr returns HTTP 409 Conflict');
    assert(p2002PnrBody?.message === 'PNR already exists', 'P2002 pnr error message is "PNR already exists"');

    // 5.3: Test errorHandler on P2025 (Record not found)
    let p2025Status = null;
    let p2025Body = null;
    const mockResP2025 = {
      status(code) { p2025Status = code; return this; },
      json(body) { p2025Body = body; return this; }
    };
    const p2025Err = new Error('Record not found');
    p2025Err.code = 'P2025';
    p2025Err.meta = { cause: 'Customer record not found' };
    errorHandler(p2025Err, {}, mockResP2025, () => {});

    assert(p2025Status === 404, 'P2025 returns HTTP 404 Not Found');
    assert(p2025Body?.success === false, 'P2025 response has success: false');
    assert(p2025Body?.message === 'Customer record not found', 'P2025 returns meaningful not-found message');

  } finally {
    server.close();
  }

  console.log('\n========================================================');
  console.log(`Production Hardening Tests: ${passed} passed, ${failed} failed`);
  console.log('========================================================\n');

  if (failed > 0) {
    console.error(`❌ Failures (${failed}):`);
    failures.forEach(f => console.error(`  - ${f}`));
    process.exit(1);
  }
}

runHardeningTests().catch(err => {
  console.error('Unhandled test runner exception:', err);
  process.exit(1);
});

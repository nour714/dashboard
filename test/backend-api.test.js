/**
 * AfricaTravel - Backend API Endpoints & Server Integration Tests
 */

import http from 'http';
import { createApp } from '../server/src/app.js';
import { AuthService } from '../server/src/services/auth.service.js';
import { setPrismaClient } from '../server/src/config/database.js';

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

async function runApiTests() {
  console.log('\n🌐 ========================================================');
  console.log('   AfricaTravel Backend API & Server Integration Tests');
  console.log('========================================================\n');

  const mockCustomers = [];
  const mockTickets = [];
  const mockExpenses = [];
  const mockAuditLogs = [];

  const mockPrisma = {
    expense: {
      create: async ({ data }) => {
        const record = { id: `EXP-${mockExpenses.length + 1}`, ...data, deletedAt: null, createdAt: new Date() };
        mockExpenses.push(record);
        return record;
      },
      findMany: async () => mockExpenses.filter(e => !e.deletedAt),
      count: async () => mockExpenses.filter(e => !e.deletedAt).length,
      findFirst: async ({ where }) => mockExpenses.find(e => (!where.id || e.id === where.id) && (!where.deletedAt || e.deletedAt === where.deletedAt)) || null,
      update: async ({ where, data }) => {
        const record = mockExpenses.find(e => e.id === where.id);
        if (record) Object.assign(record, data);
        return record || null;
      }
    },
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
          refunds: [],
          customer: { name: data.passengerName }
        };
        mockTickets.push(record);
        return record;
      },
      findFirst: async ({ where }) => {
        if (where?.OR) {
          return mockTickets.find(t => where.OR.some(cond => (cond.id && t.id === cond.id) || (cond.ticketNumber && t.ticketNumber === cond.ticketNumber) || (cond.pnr && t.pnr === cond.pnr))) || null;
        }
        return mockTickets.find(t => t.id === where?.id || t.ticketNumber === where?.ticketNumber || t.pnr === where?.pnr) || null;
      }
    },
    auditLog: {
      create: async ({ data }) => {
        mockAuditLogs.push(data);
        return data;
      }
    },
    $queryRaw: async () => [{ 1: 1 }]
  };
  setPrismaClient(mockPrisma);

  const app = createApp();
  const server = http.createServer(app);

  await new Promise((resolve) => {
    server.listen(0, '127.0.0.1', resolve);
  });

  try {
    // 1. Health check endpoint
    console.log('--- 1. Health Check Endpoint ---');
    const healthRes = await makeRequest(server, { path: '/api/health' });
    assert(healthRes.statusCode === 200 || healthRes.statusCode === 503, 'GET /api/health returns valid status code');
    assert(healthRes.json?.success === true, 'GET /api/health returns standard success envelope');
    assert(healthRes.json?.data?.timestamp, 'GET /api/health includes timestamp');

    // 2. Auth validation: Missing body
    console.log('\n--- 2. Auth Request Validation ---');
    const invalidLogin = await makeRequest(server, {
      method: 'POST',
      path: '/api/auth/login',
      body: {}
    });
    assert(invalidLogin.statusCode === 400, 'POST /api/auth/login with empty body returns 400');
    assert(invalidLogin.json?.success === false, 'POST /api/auth/login returns success: false');
    assert(invalidLogin.json?.error?.code === 'VALIDATION_ERROR', 'Validation error code formatted correctly');

    // 3. Protected endpoint without token
    console.log('\n--- 3. Protected Endpoints Security ---');
    const unauthedTickets = await makeRequest(server, {
      method: 'GET',
      path: '/api/tickets'
    });
    assert(unauthedTickets.statusCode === 401, 'GET /api/tickets without token returns 401 Unauthorized');
    assert(unauthedTickets.json?.error?.code === 'UNAUTHORIZED', 'Protected endpoint returns UNAUTHORIZED error code');

    const ticketOnlyToken = AuthService.generateAccessToken({
      id: 'EMP-TICKET-ONLY',
      name: 'Ticket Only User',
      email: 'ticket-only@example.com',
      role: 'TICKET_ONLY',
      title: 'Ticket Creation Officer'
    });
    const ticketOnlyHeaders = { authorization: `Bearer ${ticketOnlyToken}` };
    const restrictedRequests = [
      ['GET /api/customers', { method: 'GET', path: '/api/customers', headers: ticketOnlyHeaders }],
      ['GET /api/reports/summary', { method: 'GET', path: '/api/reports/summary', headers: ticketOnlyHeaders }],
      ['PATCH /api/tickets/:id', { method: 'PATCH', path: '/api/tickets/TKT-1', headers: ticketOnlyHeaders, body: {} }],
      ['POST /api/tickets/:id/payments', { method: 'POST', path: '/api/tickets/TKT-1/payments', headers: ticketOnlyHeaders, body: {} }],
      ['DELETE /api/tickets/:id', { method: 'DELETE', path: '/api/tickets/TKT-1', headers: ticketOnlyHeaders }],
      ['DELETE /api/customers/:id', { method: 'DELETE', path: '/api/customers/CUST-1', headers: ticketOnlyHeaders }],
      ['GET /api/employees', { method: 'GET', path: '/api/employees', headers: ticketOnlyHeaders }],
      ['PATCH /api/employees/:id', { method: 'PATCH', path: '/api/employees/EMP-102', headers: ticketOnlyHeaders, body: { name: 'New Name' } }],
      ['GET /api/expenses', { method: 'GET', path: '/api/expenses', headers: ticketOnlyHeaders }],
      ['POST /api/expenses', { method: 'POST', path: '/api/expenses', headers: ticketOnlyHeaders, body: { category: 'SERVICES', amount: 100, description: 'Test', date: '2026-08-28' } }],
      ['DELETE /api/expenses/:id', { method: 'DELETE', path: '/api/expenses/EXP-1', headers: ticketOnlyHeaders }]
    ];
    for (const [label, request] of restrictedRequests) {
      const response = await makeRequest(server, request);
      assert(response.statusCode === 403, `${label} returns 403 for TICKET_ONLY`);
    }

    // TICKET_ONLY role can successfully create tickets (POST /api/tickets)
    const createTicketRes = await makeRequest(server, {
      method: 'POST',
      path: '/api/tickets',
      headers: ticketOnlyHeaders,
      body: {
        passengerName: 'Nour TICKET_ONLY Officer Test',
        pnr: 'TKON12',
        origin: 'CAI',
        destination: 'DXB',
        departureDate: '2026-09-01T10:00:00.000Z',
        arrivalDate: '2026-09-01T14:00:00.000Z',
        flightNumber: 'MS 901',
        airline: 'EgyptAir',
        airlineCode: 'MS',
        tripType: 'One Way',
        cabinClass: 'Economy (Y)',
        ticketPrice: 15000,
        costPrice: 12000,
        currency: 'EGP'
      }
    });
    assert(createTicketRes.statusCode === 201, 'POST /api/tickets returns 201 for TICKET_ONLY with valid body');
    assert(createTicketRes.json?.success === true, 'POST /api/tickets returns success: true for TICKET_ONLY');
    assert(createTicketRes.json?.data?.createdById === 'EMP-TICKET-ONLY', 'Created ticket automatically binds createdById to req.user.id');

    // IDOR Protection: TICKET_ONLY cannot access tickets where createdById is null or not owned
    // 1. Ticket with createdById = null
    mockTickets.push({
      id: 'TK-NULL-CREATOR',
      ticketNumber: '077-1111111111',
      pnr: 'NULCREAT',
      ticketPrice: 10000,
      currency: 'EGP',
      status: 'CONFIRMED',
      createdById: null,
      payments: [],
      modifications: [],
      refunds: []
    });

    const getNullCreatorRes = await makeRequest(server, {
      method: 'GET',
      path: '/api/tickets/TK-NULL-CREATOR',
      headers: ticketOnlyHeaders
    });
    assert(getNullCreatorRes.statusCode === 403, 'TICKET_ONLY receiving GET /api/tickets/:id with createdById = null returns 403 Forbidden');
    assert(getNullCreatorRes.json?.error?.code === 'FORBIDDEN', 'IDOR rejection on createdById = null returns FORBIDDEN error code');

    // 2. Ticket with createdById = 'EMP-OTHER'
    mockTickets.push({
      id: 'TK-OTHER-CREATOR',
      ticketNumber: '077-2222222222',
      pnr: 'OTHCREAT',
      ticketPrice: 10000,
      currency: 'EGP',
      status: 'CONFIRMED',
      createdById: 'EMP-OTHER-USER',
      payments: [],
      modifications: [],
      refunds: []
    });

    const getOtherCreatorRes = await makeRequest(server, {
      method: 'GET',
      path: '/api/tickets/TK-OTHER-CREATOR',
      headers: ticketOnlyHeaders
    });
    assert(getOtherCreatorRes.statusCode === 403, 'TICKET_ONLY receiving GET /api/tickets/:id created by another user returns 403 Forbidden');

    // 3. Ticket with createdById = 'EMP-TICKET-ONLY' (own ticket)
    const createdTicketId = createTicketRes.json?.data?.id;
    const getOwnTicketRes = await makeRequest(server, {
      method: 'GET',
      path: `/api/tickets/${createdTicketId}`,
      headers: ticketOnlyHeaders
    });
    assert(getOwnTicketRes.statusCode === 200, 'TICKET_ONLY receiving GET /api/tickets/:id for own ticket returns 200 OK');
    assert(getOwnTicketRes.json?.data?.id === createdTicketId, 'Returned ticket data matches created ticket ID');

    // 4. Static Asset and SPA Fallback Serving
    console.log('\n--- 4. Static Frontend & SPA Fallback ---');
    const indexRes = await makeRequest(server, { path: '/index.html' });
    assert(indexRes.statusCode === 200, 'GET /index.html serves frontend static HTML');
    assert(indexRes.data.includes('AfricaTravel'), 'HTML content contains AfricaTravel application title');

    // 5. Security: Path Traversal Prevention
    console.log('\n--- 5. Security Path Traversal & Dotfile Block ---');
    const dotfileRes = await makeRequest(server, { path: '/.env' });
    assert(dotfileRes.statusCode === 403, 'Access to /.env blocked with 403 Forbidden');

    const gitRes = await makeRequest(server, { path: '/.git/config' });
    assert(gitRes.statusCode === 403, 'Access to /.git/config blocked with 403 Forbidden');

    const traversalRes = await makeRequest(server, { path: '/../../../../etc/passwd' });
    assert(traversalRes.statusCode === 403, 'Path traversal /../../../../etc/passwd blocked with 403 Forbidden');

    // 6. Security Headers Check
    console.log('\n--- 6. Security Headers (Helmet) ---');
    assert(healthRes.headers['x-content-type-options'] === 'nosniff', 'X-Content-Type-Options: nosniff header present');
    assert(healthRes.headers['x-frame-options'] === 'SAMEORIGIN' || healthRes.headers['x-frame-options'] === 'DENY', 'X-Frame-Options header present');

    // 7. RBAC: AGENT cannot process refunds, delete tickets, delete customers, or update employees (ADMIN-only)
    console.log('\n--- 7. Refund, Delete, & Staff Management RBAC Enforcement ---');
    const agentToken = AuthService.generateAccessToken({ id: 'EMP-103', name: 'Nour Wael', email: 'nour.w@africatravel.com', role: 'AGENT', title: 'Ticketing Officer' });
    const agentRefundRes = await makeRequest(server, {
      method: 'POST',
      path: '/api/tickets/TK-10254/refunds',
      headers: { 'Authorization': `Bearer ${agentToken}` },
      body: { amount: 1000, reason: 'Test refund', currency: 'EGP' }
    });
    assert(agentRefundRes.statusCode === 403, 'AGENT calling POST /api/tickets/:id/refunds receives 403 Forbidden');
    assert(agentRefundRes.json?.error?.code === 'FORBIDDEN', 'Refund rejection returns FORBIDDEN error code');

    const agentDeleteTicketRes = await makeRequest(server, {
      method: 'DELETE',
      path: '/api/tickets/TK-10254',
      headers: { 'Authorization': `Bearer ${agentToken}` }
    });
    assert(agentDeleteTicketRes.statusCode === 403, 'AGENT calling DELETE /api/tickets/:id receives 403 Forbidden');
    assert(agentDeleteTicketRes.json?.error?.code === 'FORBIDDEN', 'Ticket deletion rejection returns FORBIDDEN error code');

    const agentDeleteCustomerRes = await makeRequest(server, {
      method: 'DELETE',
      path: '/api/customers/CUST-1',
      headers: { 'Authorization': `Bearer ${agentToken}` }
    });
    assert(agentDeleteCustomerRes.statusCode === 403, 'AGENT calling DELETE /api/customers/:id receives 403 Forbidden');
    assert(agentDeleteCustomerRes.json?.error?.code === 'FORBIDDEN', 'Customer deletion rejection returns FORBIDDEN error code');

    const agentPatchEmployeeRes = await makeRequest(server, {
      method: 'PATCH',
      path: '/api/employees/EMP-102',
      headers: { 'Authorization': `Bearer ${agentToken}` },
      body: { role: 'ADMIN' }
    });
    assert(agentPatchEmployeeRes.statusCode === 403, 'AGENT calling PATCH /api/employees/:id receives 403 Forbidden');
    assert(agentPatchEmployeeRes.json?.error?.code === 'FORBIDDEN', 'Employee update rejection returns FORBIDDEN error code');

    const agentDeleteEmployeeRes = await makeRequest(server, {
      method: 'DELETE',
      path: '/api/employees/EMP-102',
      headers: { 'Authorization': `Bearer ${agentToken}` },
      body: { confirmEmployeeId: 'EMP-102' }
    });
    assert(agentDeleteEmployeeRes.statusCode === 403, 'AGENT calling DELETE /api/employees/:id receives 403 Forbidden');
    assert(agentDeleteEmployeeRes.json?.error?.code === 'FORBIDDEN', 'Employee delete rejection returns FORBIDDEN error code');

    const agentDeleteExpenseRes = await makeRequest(server, {
      method: 'DELETE',
      path: '/api/expenses/EXP-1',
      headers: { 'Authorization': `Bearer ${agentToken}` }
    });
    assert(agentDeleteExpenseRes.statusCode === 403, 'AGENT calling DELETE /api/expenses/:id receives 403 Forbidden');
    assert(agentDeleteExpenseRes.json?.error?.code === 'FORBIDDEN', 'Expense delete rejection returns FORBIDDEN error code');

    // 8. Airline Cost Price & Net Profit Validation & RBAC
    console.log('\n--- 8. Airline Cost Price & Net Profit RBAC Enforcement ---');
    const adminToken = AuthService.generateAccessToken({ id: 'EMP-ADMIN-1', name: 'Admin Master', email: 'admin@africatravel.com', role: 'ADMIN', title: 'System Administrator' });
    const adminHeaders = { 'Authorization': `Bearer ${adminToken}` };

    // A) Creating ticket without costPrice fails with ValidationError (400)
    const missingCostRes = await makeRequest(server, {
      method: 'POST',
      path: '/api/tickets',
      headers: adminHeaders,
      body: {
        passengerName: 'Cost Validation Test',
        pnr: 'COST01',
        origin: 'CAI',
        destination: 'DXB',
        departureDate: '2026-09-01T10:00:00.000Z',
        arrivalDate: '2026-09-01T14:00:00.000Z',
        flightNumber: 'MS 901',
        airline: 'EgyptAir',
        airlineCode: 'MS',
        ticketPrice: 41000,
        currency: 'EGP'
      }
    });
    assert(missingCostRes.statusCode === 400, 'POST /api/tickets without costPrice returns 400 Bad Request');
    assert(missingCostRes.json?.success === false, 'POST /api/tickets without costPrice returns success: false');
    assert(missingCostRes.json?.error?.code === 'VALIDATION_ERROR', 'Rejection code is VALIDATION_ERROR');

    // B) Creating ticket with valid costPrice succeeds and calculates netProfit
    const validCostRes = await makeRequest(server, {
      method: 'POST',
      path: '/api/tickets',
      headers: adminHeaders,
      body: {
        passengerName: 'Profit Calculation Test',
        pnr: 'PROFIT1',
        origin: 'CAI',
        destination: 'DXB',
        departureDate: '2026-09-01T10:00:00.000Z',
        arrivalDate: '2026-09-01T14:00:00.000Z',
        flightNumber: 'MS 901',
        airline: 'EgyptAir',
        airlineCode: 'MS',
        ticketPrice: 41000,
        costPrice: 35000,
        currency: 'EGP'
      }
    });
    assert(validCostRes.statusCode === 201, 'POST /api/tickets with valid costPrice returns 201 Created');
    assert(validCostRes.json?.data?.costPrice === 35000, 'ADMIN receives costPrice (35000) upon creation');
    assert(validCostRes.json?.data?.netProfit === 6000, 'ADMIN receives netProfit (6000 = 41000 - 35000) upon creation');
    assert(validCostRes.json?.data?.financials?.netProfit === 6000, 'ADMIN receives financials.netProfit (6000) upon creation');

    const profitTicketId = validCostRes.json?.data?.id;

    // C) AGENT fetching same ticket -> costPrice & netProfit are stripped from response
    const agentGetTicketRes = await makeRequest(server, {
      method: 'GET',
      path: `/api/tickets/${profitTicketId}`,
      headers: { 'Authorization': `Bearer ${agentToken}` }
    });
    assert(agentGetTicketRes.statusCode === 200, 'AGENT can fetch ticket by ID');
    assert(agentGetTicketRes.json?.data?.costPrice === undefined, 'AGENT response strips costPrice');
    assert(agentGetTicketRes.json?.data?.netProfit === undefined, 'AGENT response strips netProfit');
    assert(agentGetTicketRes.json?.data?.financials?.costPrice === undefined, 'AGENT financials strips costPrice');
    assert(agentGetTicketRes.json?.data?.financials?.netProfit === undefined, 'AGENT financials strips netProfit');

    // D) ADMIN fetching same ticket -> costPrice & netProfit are present and correct
    const adminGetTicketRes = await makeRequest(server, {
      method: 'GET',
      path: `/api/tickets/${profitTicketId}`,
      headers: adminHeaders
    });
    assert(adminGetTicketRes.statusCode === 200, 'ADMIN can fetch ticket by ID');
    assert(adminGetTicketRes.json?.data?.costPrice === 35000, 'ADMIN response includes correct costPrice (35000)');
    assert(adminGetTicketRes.json?.data?.netProfit === 6000, 'ADMIN response includes correct netProfit (6000)');
    assert(adminGetTicketRes.json?.data?.financials?.costPrice === 35000, 'ADMIN financials includes costPrice (35000)');
    assert(adminGetTicketRes.json?.data?.financials?.netProfit === 6000, 'ADMIN financials includes netProfit (6000)');

    console.log('\n========================================================');
    console.log(`Backend API Integration Tests: ${passed} passed, ${failed} failed`);
    console.log('========================================================\n');
  } finally {
    server.close();
  }

  if (failures.length > 0) {
    process.exit(1);
  }
}

runApiTests();

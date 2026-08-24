/**
 * AfricaTravel - Backend API Endpoints & Server Integration Tests
 */

import http from 'http';
import { createApp } from '../server/src/app.js';
import { AuthService } from '../server/src/services/auth.service.js';

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
      ['POST /api/tickets', { method: 'POST', path: '/api/tickets', headers: ticketOnlyHeaders, body: {} }],
      ['PATCH /api/tickets/:id', { method: 'PATCH', path: '/api/tickets/TKT-1', headers: ticketOnlyHeaders, body: {} }],
      ['POST /api/tickets/:id/payments', { method: 'POST', path: '/api/tickets/TKT-1/payments', headers: ticketOnlyHeaders, body: {} }],
      ['DELETE /api/tickets/:id', { method: 'DELETE', path: '/api/tickets/TKT-1', headers: ticketOnlyHeaders }]
    ];
    for (const [label, request] of restrictedRequests) {
      const response = await makeRequest(server, request);
      assert(response.statusCode === 403, `${label} returns 403 for TICKET_ONLY`);
    }

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

    // 7. RBAC: AGENT cannot process refunds or delete tickets (ADMIN-only)
    console.log('\n--- 7. Refund & Delete Ticket RBAC Enforcement ---');
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

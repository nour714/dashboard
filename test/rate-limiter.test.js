/**
 * AfricaTravel - Rate Limiter Integration & Unit Test
 *
 * Tests:
 * 1. authRateLimiter 429 after MAX_AUTH requests
 * 2. Header presence: RateLimit-Limit, RateLimit-Remaining, RateLimit-Reset, Retry-After
 * 3. Error response body: { success: false, error: { message, code: 'RATE_LIMIT_EXCEEDED' } }
 * 4. GET /api/health returns 200 and is not blocked
 * 5. createLimiter custom instances and behavior
 */

import http from 'http';
import { createApp } from '../server/src/app.js';
import { memoryFallbackMap, createLimiter } from '../server/src/middleware/rate-limiter.js';
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

async function runRateLimiterTests() {
  console.log('\n⏱️  ========================================================');
  console.log('   AfricaTravel Rate Limiter Verification Tests');
  console.log('========================================================\n');

  memoryFallbackMap.clear();

  const mockPrisma = {
    $queryRaw: async () => [{ 1: 1 }],
    user: {
      findFirst: async () => null
    }
  };
  setPrismaClient(mockPrisma);

  const app = createApp();
  const server = http.createServer(app);
  await new Promise(r => server.listen(0, '127.0.0.1', r));

  try {
    // 1. Health check returns 200 OK
    console.log('--- 1. Health Check Unimpeded ---');
    const healthRes = await makeRequest(server, { path: '/api/health' });
    assert(healthRes.statusCode === 200, 'GET /api/health returns 200 OK');
    assert(healthRes.json?.success === true, 'GET /api/health has success: true');

    // 2. Auth rate limiting on /api/auth/login (Max 10 per window)
    console.log('\n--- 2. Auth Rate Limiter Enforcement ---');
    let authLimited = false;
    let lastAuthRes = null;

    // Send 12 requests (limit is 10)
    for (let i = 1; i <= 12; i++) {
      const res = await makeRequest(server, {
        method: 'POST',
        path: '/api/auth/login',
        body: { email: 'wrong@example.com', password: 'wrongpassword' }
      });
      lastAuthRes = res;
      if (res.statusCode === 429) {
        authLimited = true;
        break;
      }
    }

    assert(authLimited, 'POST /api/auth/login triggers 429 Too Many Requests after 10 requests');
    assert(lastAuthRes?.json?.error?.code === 'RATE_LIMIT_EXCEEDED', '429 error code is RATE_LIMIT_EXCEEDED');
    assert(lastAuthRes?.json?.error?.message === 'Too many authentication attempts. Please try again later.', '429 returns custom auth rate limit message');
    assert(Boolean(lastAuthRes?.headers['ratelimit-limit']), 'RateLimit-Limit header present');
    assert(lastAuthRes?.headers['ratelimit-remaining'] === '0', 'RateLimit-Remaining is 0 on 429');
    assert(Boolean(lastAuthRes?.headers['retry-after']), 'Retry-After header present');

    // 3. Custom limiter functionality
    console.log('\n--- 3. Custom Limiter Functionality ---');
    const testLimiter = createLimiter({
      name: 'test-custom',
      windowMs: 5000,
      max: 3,
      message: 'Custom limit reached'
    });

    let testStatus = null;
    let testJson = null;
    let testHeaders = {};
    const mockRes = {
      setHeader(k, v) { testHeaders[k.toLowerCase()] = v; },
      status(code) { testStatus = code; return this; },
      json(body) { testJson = body; return this; }
    };
    const mockReq = { ip: '192.168.1.50', headers: {} };

    // Request 1
    let nextCalled = 0;
    await testLimiter(mockReq, mockRes, () => { nextCalled++; });
    assert(nextCalled === 1 && testStatus === null, 'Request 1/3 passes through limiter');
    assert(testHeaders['ratelimit-remaining'] === 2, 'Remaining budget is 2');

    // Request 2
    await testLimiter(mockReq, mockRes, () => { nextCalled++; });
    assert(nextCalled === 2 && testStatus === null, 'Request 2/3 passes through limiter');
    assert(testHeaders['ratelimit-remaining'] === 1, 'Remaining budget is 1');

    // Request 3
    await testLimiter(mockReq, mockRes, () => { nextCalled++; });
    assert(nextCalled === 3 && testStatus === null, 'Request 3/3 passes through limiter');
    assert(testHeaders['ratelimit-remaining'] === 0, 'Remaining budget is 0');

    // Request 4 (Exceeds limit)
    await testLimiter(mockReq, mockRes, () => { nextCalled++; });
    assert(testStatus === 429, 'Request 4/3 returns 429');
    assert(testJson?.error?.message === 'Custom limit reached', 'Custom message correctly returned');
    assert(testJson?.error?.code === 'RATE_LIMIT_EXCEEDED', 'RATE_LIMIT_EXCEEDED returned');

  } finally {
    server.close();
  }

  console.log('\n========================================================');
  console.log(`Rate Limiter Verification: ${passed} passed, ${failed} failed`);
  console.log('========================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runRateLimiterTests();

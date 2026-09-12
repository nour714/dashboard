// لازم يكون أول سطر فعلي في الملف — قبل أي import
process.env.RATE_LIMIT_MAX_AUTH = '10';

const http = (await import('http')).default;
const { createApp } = await import('../server/src/app.js');
const { memoryFallbackMap, createLimiter } = await import('../server/src/middleware/rate-limiter.js');
const { setPrismaClient } = await import('../server/src/config/database.js');

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

    // 2. Auth rate limiting on /api/auth/login
    const configuredAuthMax = Number(process.env.RATE_LIMIT_MAX_AUTH) || 10;
    console.log(`\n--- 2. Auth Rate Limiter Enforcement (limit: ${configuredAuthMax}) ---`);
    let authLimited = false;
    let lastAuthRes = null;

    // Send requests exceeding configured limit to ensure 429 threshold is reached
    for (let i = 1; i <= configuredAuthMax + 2; i++) {
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

    assert(authLimited, `POST /api/auth/login triggers 429 after ${configuredAuthMax} requests`);
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

    // 4. Upstash Distributed Mode (Available)
    console.log('\n--- 4. Upstash Distributed Mode (Available) ---');
    const mockUpstashLimiter = {
      calls: 0,
      async limit() {
        mockUpstashLimiter.calls++;
        if (mockUpstashLimiter.calls <= 2) {
          return { success: true, limit: 2, remaining: 2 - mockUpstashLimiter.calls, reset: Date.now() + 10000 };
        }
        return { success: false, limit: 2, remaining: 0, reset: Date.now() + 5000 };
      }
    };

    const distributedLimiter = createLimiter({
      name: 'distributed-test',
      windowMs: 10000,
      max: 2,
      upstashLimiter: mockUpstashLimiter
    });

    let distHeaders = {};
    let distStatus = null;
    let distJson = null;
    const mockDistRes = {
      setHeader(k, v) { distHeaders[k.toLowerCase()] = v; },
      status(code) { distStatus = code; return this; },
      json(body) { distJson = body; return this; }
    };

    let distNextCalls = 0;
    await distributedLimiter(mockReq, mockDistRes, () => { distNextCalls++; });
    assert(distNextCalls === 1 && distStatus === null, 'Upstash request 1/2 allowed');
    assert(distHeaders['ratelimit-limit'] === 2, 'Upstash RateLimit-Limit header matches');
    assert(distHeaders['ratelimit-remaining'] === 1, 'Upstash RateLimit-Remaining is 1');

    await distributedLimiter(mockReq, mockDistRes, () => { distNextCalls++; });
    assert(distNextCalls === 2 && distStatus === null, 'Upstash request 2/2 allowed');
    assert(distHeaders['ratelimit-remaining'] === 0, 'Upstash RateLimit-Remaining is 0');

    // 3rd call exceeds Upstash limit -> 429
    await distributedLimiter(mockReq, mockDistRes, () => { distNextCalls++; });
    assert(distStatus === 429, 'Upstash returns 429 when budget exceeded');
    assert(distJson?.error?.code === 'RATE_LIMIT_EXCEEDED', 'Upstash returns RATE_LIMIT_EXCEEDED error code');
    assert(Boolean(distHeaders['retry-after']), 'Upstash sets Retry-After header');

    // 5. Upstash Unavailable (Fail-Open / In-Memory Fallback)
    console.log('\n--- 5. Upstash Unavailable (Graceful In-Memory Fallback) ---');
    const failingUpstashLimiter = {
      async limit() {
        throw new Error('Upstash cluster unreachable / connection timeout');
      }
    };

    const resilientLimiter = createLimiter({
      name: 'resilient-test',
      windowMs: 5000,
      max: 2,
      upstashLimiter: failingUpstashLimiter
    });

    let resNextCalls = 0;
    let resStatus = null;
    let resHeaders = {};
    const mockResilientRes = {
      setHeader(k, v) { resHeaders[k.toLowerCase()] = v; },
      status(code) { resStatus = code; return this; },
      json(body) { return this; }
    };

    // Should not crash or return 500; gracefully falls back to in-memory store
    await resilientLimiter(mockReq, mockResilientRes, () => { resNextCalls++; });
    assert(resNextCalls === 1 && resStatus === null, 'Failing Upstash gracefully falls back to in-memory without 500');
    assert(Boolean(resHeaders['ratelimit-limit']), 'In-memory fallback sets RateLimit-Limit header');

    // 6. Sensitive Fallback Mode (auth / refresh Stricter Local Threshold)
    console.log('\n--- 6. Sensitive Fallback Mode (Stricter Local Threshold) ---');
    memoryFallbackMap.clear();

    const sensitiveAuthLimiter = createLimiter({
      name: 'auth',
      windowMs: 5000,
      max: 6, // max is 6, so effectiveMax should be throttled to Math.ceil(6 / 2) = 3
      message: 'Too many auth attempts'
    });

    let sensStatus = null;
    let sensJson = null;
    let sensHeaders = {};
    const mockSensRes = {
      setHeader(k, v) { sensHeaders[k.toLowerCase()] = v; },
      status(code) { sensStatus = code; return this; },
      json(body) { sensJson = body; return this; }
    };
    const sensReq = { ip: '10.0.0.99', headers: {} };

    let sensNextCalls = 0;
    // Requests 1, 2, 3 should pass (threshold is 3)
    for (let i = 1; i <= 3; i++) {
      await sensitiveAuthLimiter(sensReq, mockSensRes, () => { sensNextCalls++; });
    }
    assert(sensNextCalls === 3 && sensStatus === null, 'Sensitive limiter allows 3 requests under stricter fallback');
    assert(sensHeaders['ratelimit-limit'] === 3, 'Sensitive fallback RateLimit-Limit header reflects throttled max (3)');

    // 4th request exceeds stricter threshold (3)
    await sensitiveAuthLimiter(sensReq, mockSensRes, () => { sensNextCalls++; });
    assert(sensStatus === 429, '4th request on sensitive limiter returns 429');
    assert(sensHeaders['retry-after'] !== undefined, 'Retry-After header present on sensitive 429');
    assert(sensHeaders['ratelimit-remaining'] === 0, 'RateLimit-Remaining is 0 on sensitive 429');

    // 7. Normal Fallback Mode (Standard API Threshold)
    console.log('\n--- 7. Normal Fallback Mode (Standard Threshold) ---');
    const normalApiLimiter = createLimiter({
      name: 'api',
      windowMs: 5000,
      max: 4
    });

    let normStatus = null;
    let normHeaders = {};
    const mockNormRes = {
      setHeader(k, v) { normHeaders[k.toLowerCase()] = v; },
      status(code) { normStatus = code; return this; },
      json(body) { return this; }
    };
    const normReq = { ip: '10.0.0.101', headers: {} };

    let normNextCalls = 0;
    for (let i = 1; i <= 4; i++) {
      await normalApiLimiter(normReq, mockNormRes, () => { normNextCalls++; });
    }
    assert(normNextCalls === 4 && normStatus === null, 'Normal api limiter allows all 4 requests up to standard max');
    assert(normHeaders['ratelimit-limit'] === 4, 'Normal fallback RateLimit-Limit header reflects standard max (4)');

    // 5th request exceeds standard max
    await normalApiLimiter(normReq, mockNormRes, () => { normNextCalls++; });
    assert(normStatus === 429, '5th request on normal api limiter returns 429');

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

/**
 * AfricaTravel - Backend Authentication & Security Unit Tests
 */

import http from 'http';
import jwt from 'jsonwebtoken';
import { createApp } from '../server/src/app.js';
import { AuthService } from '../server/src/services/auth.service.js';
import { authenticate, requireRole, lastActiveTouchCache } from '../server/src/middleware/auth.js';
import { setPrismaClient } from '../server/src/config/database.js';
import { env } from '../server/src/config/env.js';
import { UnauthorizedError, ForbiddenError } from '../server/src/domain/errors.js';
import { isEmployeeOnline, formatLastSeen } from '../js/utils/online-status.js';

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

async function runAuthTests() {
  console.log('\n🔒 ========================================================');
  console.log('   AfricaTravel Authentication & Security Tests');
  console.log('========================================================\n');

  // 1. Password Hashing with Bcrypt
  console.log('--- 1. Bcrypt Password Hashing & Verification ---');
  const plainPassword = 'SuperSecurePassword2026!';
  const hash = await AuthService.hashPassword(plainPassword);

  assert(hash !== plainPassword, 'Password is not stored in plaintext');
  assert(hash.startsWith('$2'), 'Password hash uses bcrypt format');
  assert(await AuthService.comparePassword(plainPassword, hash), 'Correct password successfully matches hash');
  assert(!await AuthService.comparePassword('WrongPassword123', hash), 'Incorrect password correctly rejected');

  // 2. JWT Access Token Generation & Verification
  console.log('\n--- 2. JWT Generation & Payload Verification ---');
  const user = {
    id: 'EMP-101',
    name: 'Mohamed Raafat',
    email: 'admin@africatravel.com',
    role: 'ADMIN',
    title: 'Senior Operations Director'
  };

  const token = AuthService.generateAccessToken(user);
  assert(typeof token === 'string' && token.split('.').length === 3, 'Valid 3-part JWT token generated');

  const decoded = jwt.verify(token, env.JWT_SECRET);
  assert(decoded.id === 'EMP-101', 'Decoded JWT payload contains correct user ID');
  assert(decoded.role === 'ADMIN', 'Decoded JWT payload contains correct role');
  assert(decoded.email === 'admin@africatravel.com', 'Decoded JWT payload contains correct email');

  // 3. Refresh Token Generation & Hashing
  console.log('\n--- 3. Refresh Token Management ---');
  const rawRefreshToken = AuthService.generateRefreshTokenString();
  assert(rawRefreshToken.length === 80, 'Refresh token generates 80 hex characters of entropy');

  const hashedToken = AuthService.hashToken(rawRefreshToken);
  assert(hashedToken.length === 64, 'SHA-256 hash creates 64-char hex digest');
  assert(hashedToken === AuthService.hashToken(rawRefreshToken), 'Hash is deterministic for database lookup');

  // 4. Authentication Middleware Verification
  console.log('\n--- 4. Authentication Middleware Tests ---');
  
  // Valid token
  let nextCalled = false;
  let capturedErr = null;
  const mockReqValid = { headers: { authorization: `Bearer ${token}` } };
  const mockRes = {};
  
  authenticate(mockReqValid, mockRes, (err) => {
    nextCalled = true;
    capturedErr = err;
  });
  assert(nextCalled && !capturedErr && mockReqValid.user?.id === 'EMP-101', 'authenticate middleware accepts valid Bearer token and populates req.user');

  // Missing header
  let missingErr = null;
  authenticate({ headers: {} }, mockRes, (err) => {
    missingErr = err;
  });
  assert(missingErr instanceof UnauthorizedError, 'Missing authorization header yields UnauthorizedError');

  // Invalid token
  let invalidErr = null;
  authenticate({ headers: { authorization: 'Bearer invalid.jwt.token' } }, mockRes, (err) => {
    invalidErr = err;
  });
  assert(invalidErr instanceof UnauthorizedError, 'Invalid token string yields UnauthorizedError');

  // 5. Role-Based Access Control (RBAC) Middleware
  console.log('\n--- 5. RBAC Middleware Tests ---');
  const adminReq = { user: { role: 'ADMIN' } };
  const agentReq = { user: { role: 'AGENT' } };

  let rbacPassed = false;
  requireRole('ADMIN')(adminReq, mockRes, (err) => {
    if (!err) rbacPassed = true;
  });
  assert(rbacPassed, 'ADMIN role passes requireRole("ADMIN")');

  let rbacDenied = false;
  requireRole('ADMIN')(agentReq, mockRes, (err) => {
    if (err instanceof ForbiddenError) rbacDenied = true;
  });
  assert(rbacDenied, 'AGENT role denied with ForbiddenError on requireRole("ADMIN")');

  let multiRolePassed = false;
  requireRole('ADMIN', 'AGENT')(agentReq, mockRes, (err) => {
    if (!err) multiRolePassed = true;
  });
  assert(multiRolePassed, 'AGENT role passes requireRole("ADMIN", "AGENT")');

  // 6. Remember Me & Refresh Token Cookie Policy
  console.log('\n--- 6. Remember Me & Refresh Cookie Policy ---');
  
  const testUserPasswordHash = await AuthService.hashPassword('Password123!');
  const mockAuthUser = {
    id: 'EMP-AUTH-1',
    name: 'Auth Tester',
    email: 'authtest@africatravel.com',
    role: 'ADMIN',
    title: 'Security Director',
    status: 'ACTIVE',
    passwordHash: testUserPasswordHash
  };

  const userUpdateCalls = [];
  const mockTokens = new Map();
  let tokenCounter = 1;

  const mockPrisma = {
    user: {
      findFirst: async ({ where }) => {
        if (where?.email?.equals?.toLowerCase() === mockAuthUser.email.toLowerCase() || where?.email === mockAuthUser.email) {
          return mockAuthUser;
        }
        return null;
      },
      update: async ({ where, data }) => {
        userUpdateCalls.push({ where, data });
        Object.assign(mockAuthUser, data);
        return mockAuthUser;
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
        return { ...record, user: mockAuthUser };
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
    ticket: {
      findMany: async () => [],
      count: async () => 0
    },
    $queryRaw: async () => [{ 1: 1 }],
    $transaction: async (arg) => {
      if (typeof arg === 'function') {
        return await arg(mockPrisma);
      }
      return arg;
    }
  };

  setPrismaClient(mockPrisma);

  const app = createApp();
  const server = http.createServer(app);
  await new Promise(r => server.listen(0, '127.0.0.1', r));

  try {
    // 1. rememberMe: true -> Cookie has Max-Age (Max-Age=604800)
    const resRememberTrue = await makeRequest(server, {
      method: 'POST',
      path: '/api/auth/login',
      body: { email: 'authtest@africatravel.com', password: 'Password123!', rememberMe: true }
    });
    assert(resRememberTrue.statusCode === 200, 'POST /api/auth/login with rememberMe: true returns 200');
    const setCookieTrue = resRememberTrue.headers['set-cookie']?.[0] || '';
    assert(setCookieTrue.includes('Max-Age=604800'), 'rememberMe: true cookie header contains Max-Age=604800 (7 days persistent)');
    assert(setCookieTrue.includes('HttpOnly'), 'rememberMe: true cookie header is HttpOnly');

    // 2. rememberMe: false -> Session cookie (NO Max-Age and NO Expires)
    const resRememberFalse = await makeRequest(server, {
      method: 'POST',
      path: '/api/auth/login',
      body: { email: 'authtest@africatravel.com', password: 'Password123!', rememberMe: false }
    });
    assert(resRememberFalse.statusCode === 200, 'POST /api/auth/login with rememberMe: false returns 200');
    const setCookieFalse = resRememberFalse.headers['set-cookie']?.[0] || '';
    assert(!setCookieFalse.toLowerCase().includes('max-age'), 'rememberMe: false cookie header does NOT contain Max-Age (session cookie)');
    assert(!setCookieFalse.toLowerCase().includes('expires='), 'rememberMe: false cookie header does NOT contain Expires (session cookie)');
    assert(setCookieFalse.includes('HttpOnly'), 'rememberMe: false cookie header is HttpOnly');

    // 3. rememberMe omitted (default) -> Behaves as rememberMe: true (backward compatible)
    const resRememberDefault = await makeRequest(server, {
      method: 'POST',
      path: '/api/auth/login',
      body: { email: 'authtest@africatravel.com', password: 'Password123!' }
    });
    assert(resRememberDefault.statusCode === 200, 'POST /api/auth/login with default rememberMe returns 200');
    const setCookieDefault = resRememberDefault.headers['set-cookie']?.[0] || '';
    assert(setCookieDefault.includes('Max-Age=604800'), 'Default rememberMe cookie header contains Max-Age=604800 (7 days persistent)');

    // 4. Silent Refresh using httpOnly Cookie & Cookie-Parser Middleware
    console.log('\n--- 7. Silent Refresh via httpOnly Cookie ---');

    // (a) Extract cookie from login response Set-Cookie header
    const rawCookieHeader = setCookieTrue.split(';')[0]; // e.g. "refreshToken=..."
    assert(rawCookieHeader.startsWith('refreshToken='), 'Login response sets refreshToken cookie in Set-Cookie header');

    // (b) Send POST /api/auth/refresh with Cookie header
    const refreshResWithCookie = await makeRequest(server, {
      method: 'POST',
      path: '/api/auth/refresh',
      headers: {
        'Cookie': rawCookieHeader
      }
    });

    assert(refreshResWithCookie.statusCode === 200, 'POST /api/auth/refresh with Cookie header parsed by cookie-parser returns 200 OK');
    assert(refreshResWithCookie.json?.success === true, 'Refresh response success is true');
    assert(typeof refreshResWithCookie.json?.data?.accessToken === 'string', 'Refresh response returns fresh accessToken');
    const newDecoded = jwt.verify(refreshResWithCookie.json.data.accessToken, env.JWT_SECRET);
    assert(newDecoded.id === mockAuthUser.id, 'Rotated accessToken contains correct user payload');

    // (c) Send POST /api/auth/refresh without any Cookie header -> MUST fail with 400
    const refreshResWithoutCookie = await makeRequest(server, {
      method: 'POST',
      path: '/api/auth/refresh'
    });

    assert(refreshResWithoutCookie.statusCode === 400, 'POST /api/auth/refresh without Cookie header returns 400 Bad Request');
    assert(refreshResWithoutCookie.json?.success === false, 'Missing cookie request success is false');
    assert(refreshResWithoutCookie.json?.error?.message?.includes('Refresh token is required'), 'Error message states "Refresh token is required"');

    // 8. Online Presence Activity Tracking & Throttling
    console.log('\n--- 8. Online Presence Tracking & 60s Throttling ---');
    lastActiveTouchCache.clear();
    const testAuthToken = AuthService.generateAccessToken(mockAuthUser);
    const authHeaders = { Authorization: `Bearer ${testAuthToken}` };

    // Request 1: Should trigger lastActive update
    const prevUpdates = userUpdateCalls.length;
    await makeRequest(server, {
      method: 'GET',
      path: '/api/tickets',
      headers: authHeaders
    });

    // Wait a tiny moment for fire-and-forget update
    await new Promise(r => setTimeout(r, 50));
    assert(lastActiveTouchCache.has(mockAuthUser.id), '1st authenticated request sets timestamp in lastActiveTouchCache');
    const firstTouchTime = lastActiveTouchCache.get(mockAuthUser.id);
    const updatesAfterFirst = userUpdateCalls.length;
    assert(updatesAfterFirst > prevUpdates, '1st authenticated request triggers prisma.user.update for lastActive');

    // Request 2: Immediate second request within 60s -> MUST be throttled (no new update)
    await makeRequest(server, {
      method: 'GET',
      path: '/api/tickets',
      headers: authHeaders
    });
    await new Promise(r => setTimeout(r, 50));
    assert(lastActiveTouchCache.get(mockAuthUser.id) === firstTouchTime, '2nd request within 60s does not change touch cache (throttled)');
    assert(userUpdateCalls.length === updatesAfterFirst, '2nd request within 60s skips prisma.user.update');

    // Request 3: Fast-forward touch cache past 60s -> MUST update again
    lastActiveTouchCache.set(mockAuthUser.id, Date.now() - 61_000);
    await makeRequest(server, {
      method: 'GET',
      path: '/api/tickets',
      headers: authHeaders
    });
    await new Promise(r => setTimeout(r, 50));
    assert(lastActiveTouchCache.get(mockAuthUser.id) > firstTouchTime, 'Request after > 60s updates touch cache');
    assert(userUpdateCalls.length > updatesAfterFirst, 'Request after > 60s triggers new prisma.user.update');

    // 9. Frontend Online Status & Last Seen Utilities
    console.log('\n--- 9. Frontend Online Status Utility Tests ---');
    // Threshold checks (< 5 mins online, >= 5 mins offline)
    const nowIso = new Date().toISOString();
    const threeMinAgoIso = new Date(Date.now() - 3 * 60 * 1000).toISOString();
    const sixMinAgoIso = new Date(Date.now() - 6 * 60 * 1000).toISOString();
    const twoHoursAgoIso = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
    const threeDaysAgoIso = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();

    assert(isEmployeeOnline(nowIso) === true, 'Employee active now is online');
    assert(isEmployeeOnline(threeMinAgoIso) === true, 'Employee active 3 min ago is online');
    assert(isEmployeeOnline(sixMinAgoIso) === false, 'Employee active 6 min ago is offline');
    assert(isEmployeeOnline(null) === false, 'Employee with null lastActive is offline');
    assert(isEmployeeOnline('invalid') === false, 'Employee with invalid lastActive is offline');

    const mockT = (key) => {
      const dict = {
        'employees.neverLoggedIn': 'Never logged in',
        'employees.onlineNow': 'Online now',
        'employees.lastSeen': 'Last seen',
        'common.minutesAgo': 'minutes ago',
        'common.hoursAgo': 'hours ago',
        'common.daysAgo': 'days ago'
      };
      return dict[key] || key;
    };

    assert(formatLastSeen(null, mockT) === 'Never logged in', 'formatLastSeen with null returns "Never logged in"');
    assert(formatLastSeen(nowIso, mockT) === 'Online now', 'formatLastSeen for now returns "Online now"');
    assert(formatLastSeen(threeMinAgoIso, mockT) === 'Online now', 'formatLastSeen for 3m ago returns "Online now"');
    assert(formatLastSeen(sixMinAgoIso, mockT).includes('6 minutes ago'), 'formatLastSeen for 6m ago formats minutes');
    assert(formatLastSeen(twoHoursAgoIso, mockT).includes('2 hours ago'), 'formatLastSeen for 2h ago formats hours');
    assert(formatLastSeen(threeDaysAgoIso, mockT).includes('3 days ago'), 'formatLastSeen for 3d ago formats days');
  } finally {
    server.close();
  }

  console.log('\n========================================================');
  console.log(`Auth & Security Tests: ${passed} passed, ${failed} failed`);
  console.log('========================================================\n');

  if (failures.length > 0) {
    process.exit(1);
  }
}

runAuthTests();

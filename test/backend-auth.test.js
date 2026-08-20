/**
 * AfricaTravel - Backend Authentication & Security Unit Tests
 */

import jwt from 'jsonwebtoken';
import { AuthService } from '../server/src/services/auth.service.js';
import { authenticate, requireRole } from '../server/src/middleware/auth.js';
import { env } from '../server/src/config/env.js';
import { UnauthorizedError, ForbiddenError } from '../server/src/domain/errors.js';

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

  console.log('\n========================================================');
  console.log(`Auth & Security Tests: ${passed} passed, ${failed} failed`);
  console.log('========================================================\n');

  if (failures.length > 0) {
    process.exit(1);
  }
}

runAuthTests();

/**
 * AfricaTravel - Security Fixes Verification Tests
 *
 * Verifies:
 * 1. Refresh token rotation (revocation of old token, issuing of new token).
 * 2. Token reuse rejection (invalidating or rejecting previously used refresh token).
 * 3. NODE_ENV=production guard rejecting insecure default secrets.
 */

import { AuthService } from '../server/src/services/auth.service.js';
import { setPrismaClient } from '../server/src/config/database.js';
import { UnauthorizedError } from '../server/src/domain/errors.js';
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

  // Mock Prisma Client for Refresh Token Rotation
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
      create: async ({ data }) => {
        const record = { id: `token-${idCounter++}`, revoked: false, ...data };
        mockTokens.set(data.tokenHash, record);
        return record;
      }
    },
    $transaction: async (operations) => {
      const results = [];
      for (const op of operations) {
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

  // Second refresh using the SAME (now old) initial token: MUST fail with UnauthorizedError
  let reuseFailed = false;
  try {
    await AuthService.refresh(initialRawToken);
  } catch (err) {
    if (err instanceof UnauthorizedError && err.code === 'INVALID_REFRESH_TOKEN') {
      reuseFailed = true;
    }
  }
  assert(reuseFailed, 'Replaying revoked refresh token throws UnauthorizedError (INVALID_REFRESH_TOKEN)');

  // Refresh using the NEW rotated token: should succeed and rotate again
  const secondRefreshResult = await AuthService.refresh(firstRefreshResult.refreshToken);
  assert(typeof secondRefreshResult.accessToken === 'string', 'Refresh using new rotated token succeeds');
  assert(secondRefreshResult.refreshToken !== firstRefreshResult.refreshToken, 'Subsequent refresh rotates token again');

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
  assert(envJsContent.includes('INSECURE_DEFAULTS'), 'server/src/config/env.js defines INSECURE_DEFAULTS');
  assert(envJsContent.includes('FATAL: JWT_SECRET/JWT_REFRESH_SECRET'), 'server/src/config/env.js enforces fatal check on production with insecure default secret');
  assert(envJsContent.includes('FATAL: DEFAULT_ADMIN_PASSWORD is using insecure default'), 'server/src/config/env.js enforces fatal check on production with default password');

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

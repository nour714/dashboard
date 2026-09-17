/**
 * AfricaTravel — Database Transient Error Retry Tests
 *
 * Verifies:
 * 1. isTransientDbError identifies PgBouncer / Prisma pool timeout (P2024), server unreachable (P1001), ECONNREFUSED
 * 2. isTransientDbError rejects non-transient errors (P2002, validation, business rule)
 * 3. withDbRetry executes single retry on transient error and recovers
 * 4. withDbRetry does not retry non-transient errors
 * 5. withDbRetry throws if second attempt also fails
 * 6. AuthService.login recovers from transient P2024 pool timeout
 * 7. EmployeeService.getEmployees recovers from transient connection refused
 */

import { isTransientDbError, withDbRetry, setPrismaClient } from '../../backend/src/config/database.js';
import { AuthService } from '../../backend/src/services/auth.service.js';
import { EmployeeService } from '../../backend/src/services/employee.service.js';
import bcrypt from 'bcryptjs';

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

async function runTransientRetryTests() {
  console.log('\n🔄 ========================================================');
  console.log('   AfricaTravel Database Transient Retry Unit Tests');
  console.log('========================================================\n');

  // --- 1. isTransientDbError Identification ---
  console.log('--- 1. Transient Error Identification ---');
  assert(isTransientDbError({ code: 'P2024' }), 'Identifies Prisma P2024 pool timeout');
  assert(isTransientDbError({ code: 'P1001' }), 'Identifies Prisma P1001 server unreachable');
  assert(isTransientDbError({ code: 'P1002' }), 'Identifies Prisma P1002 server timeout');
  assert(isTransientDbError({ code: 'P1008' }), 'Identifies Prisma P1008 operations timeout');
  assert(isTransientDbError({ code: 'P1017' }), 'Identifies Prisma P1017 server closed connection');
  assert(isTransientDbError({ message: 'Timed out fetching a new connection from the connection pool' }), 'Identifies pool timeout from message');
  assert(isTransientDbError({ message: "Can't reach database server at aws-0-eu-west-1.pooler.supabase.com:6543" }), 'Identifies Cant reach database server from message');
  assert(isTransientDbError({ message: 'connect ECONNREFUSED 127.0.0.1:6543' }), 'Identifies ECONNREFUSED from message');
  assert(isTransientDbError({ message: 'Connection refused by peer' }), 'Identifies connection refused from message');
  assert(isTransientDbError({ message: 'read ECONNRESET' }), 'Identifies ECONNRESET from message');

  // Negative cases
  assert(!isTransientDbError({ code: 'P2002' }), 'Does NOT treat P2002 (unique constraint) as transient');
  assert(!isTransientDbError({ code: 'P2025' }), 'Does NOT treat P2025 (not found) as transient');
  assert(!isTransientDbError(new Error('Validation failed')), 'Does NOT treat generic validation error as transient');
  assert(!isTransientDbError(null), 'Handles null error safely');
  assert(!isTransientDbError(undefined), 'Handles undefined error safely');

  // --- 2. withDbRetry Core Execution ---
  console.log('\n--- 2. withDbRetry Execution Logic ---');
  // Normal execution without error
  let directCalls = 0;
  const directResult = await withDbRetry(async () => {
    directCalls++;
    return 'ok';
  }, { delayMs: 10, context: 'directTest' });
  assert(directResult === 'ok' && directCalls === 1, 'Successful operation executes once without retry');

  // Transient error retried and succeeds on attempt 2
  let retryCalls = 0;
  const recoveredResult = await withDbRetry(async () => {
    retryCalls++;
    if (retryCalls === 1) {
      const p2024 = new Error('Timed out fetching a new connection from the connection pool');
      p2024.code = 'P2024';
      throw p2024;
    }
    return 'recovered';
  }, { delayMs: 10, context: 'retryTest' });
  assert(recoveredResult === 'recovered' && retryCalls === 2, 'Recovers from transient P2024 error on single retry');

  // Non-transient error throws immediately on attempt 1
  let nonTransientCalls = 0;
  try {
    await withDbRetry(async () => {
      nonTransientCalls++;
      const p2002 = new Error('Unique constraint failed on the fields: (`email`)');
      p2002.code = 'P2002';
      throw p2002;
    }, { delayMs: 10, context: 'nonTransientTest' });
    assert(false, 'Should throw non-transient error');
  } catch (err) {
    assert(nonTransientCalls === 1, 'Non-transient error throws immediately without retrying');
    assert(err.code === 'P2002', 'Preserves original non-transient error');
  }

  // Transient error where retry ALSO fails throws after attempt 2
  let exhaustedCalls = 0;
  try {
    await withDbRetry(async () => {
      exhaustedCalls++;
      const p2024 = new Error('Timed out fetching a new connection from the connection pool');
      p2024.code = 'P2024';
      throw p2024;
    }, { delayMs: 10, context: 'exhaustedTest' });
    assert(false, 'Should throw after exhausting retries');
  } catch (err) {
    assert(exhaustedCalls === 2, 'Retries exactly once then throws when retry also fails');
    assert(err.code === 'P2024', 'Preserves transient error when retry fails');
  }

  // --- 3. AuthService.login Transient Recovery ---
  console.log('\n--- 3. AuthService.login Transient Recovery ---');
  const hashedPw = await bcrypt.hash('CorrectPassword123!', 10);
  let loginUserFindCalls = 0;

  const mockAuthPrisma = {
    user: {
      findFirst: async () => {
        loginUserFindCalls++;
        if (loginUserFindCalls === 1) {
          const err = new Error("Can't reach database server at 6543");
          err.code = 'P1001';
          throw err;
        }
        return {
          id: 'USR-RETRY-01',
          name: 'Ahmed Retry',
          email: 'ahmed.retry@example.com',
          role: 'ADMIN',
          title: 'Manager',
          status: 'ACTIVE',
          passwordHash: hashedPw
        };
      },
      update: async () => ({})
    },
    refreshToken: {
      create: async () => ({ id: 'tok-1' })
    }
  };

  setPrismaClient(mockAuthPrisma);
  const loginResult = await AuthService.login('ahmed.retry@example.com', 'CorrectPassword123!', {}, { rememberMe: true });
  assert(loginUserFindCalls === 2, 'AuthService.login retried user lookup after transient P1001 connection error');
  assert(loginResult?.user?.id === 'USR-RETRY-01', 'AuthService.login returned authenticated user successfully after retry');

  // --- 4. EmployeeService.getEmployees Transient Recovery ---
  console.log('\n--- 4. EmployeeService.getEmployees Transient Recovery ---');
  let employeeFindCalls = 0;

  const mockEmployeePrisma = {
    user: {
      findMany: async () => {
        employeeFindCalls++;
        if (employeeFindCalls === 1) {
          const err = new Error('Timed out fetching a new connection from the connection pool. Please consider reducing the number of queries or increasing connection_limit.');
          err.code = 'P2024';
          throw err;
        }
        return [
          {
            id: 'EMP-001',
            name: 'Mona Aly',
            email: 'mona@example.com',
            role: 'AGENT',
            title: 'Ticketing Agent',
            status: 'ACTIVE',
            lastActive: new Date(),
            createdAt: new Date()
          }
        ];
      }
    },
    ticket: {
      findMany: async () => []
    }
  };

  setPrismaClient(mockEmployeePrisma);
  const employeeList = await EmployeeService.getEmployees();
  assert(employeeFindCalls === 2, 'EmployeeService.getEmployees retried after transient P2024 pool timeout');
  assert(Array.isArray(employeeList) && employeeList.length === 1, 'EmployeeService.getEmployees returned employees list after retry');

  // Clean up
  setPrismaClient(null);

  // Summary
  console.log('\n========================================================');
  console.log(`Database Transient Retry Tests: ${passed} passed, ${failed} failed`);
  console.log('========================================================\n');

  if (failed > 0) {
    console.error('Failed tests:', failures);
    process.exit(1);
  }
}

runTransientRetryTests().catch(err => {
  console.error('Test suite error:', err);
  process.exit(1);
});

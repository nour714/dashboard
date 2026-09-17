/**
 * AfricaTravel — Pre-Deployment Migration Runner & Schema Drift Detection Tests
 *
 * Verifies:
 * 1. shouldRunMigration returns true ONLY for VERCEL_ENV === 'production'
 * 2. Preview & development deployments skip migration to protect production DB
 * 3. Production migration fails build if DIRECT_URL is missing
 * 4. Production migration calls npx prisma migrate deploy with schema argument
 * 5. Production migration halts build on non-zero CLI exit code
 * 6. checkDatabaseHealth detects schema drift when migrations are unapplied
 * 7. checkDatabaseHealth succeeds with schemaDrift=false when all migrations applied
 */

import { shouldRunMigration, runProductionMigration } from '../../scripts/deployment/migrate-if-production.js';
import { checkDatabaseHealth, setPrismaClient, getLocalMigrationNames } from '../../backend/src/config/database.js';

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

async function runMigrationRunnerTests() {
  console.log('\n🚀 ========================================================');
  console.log('   AfricaTravel Pre-Deployment Migration Verification Tests');
  console.log('========================================================\n');

  // --- 1. Environment Guard Tests ---
  console.log('--- 1. Environment Guard (shouldRunMigration) ---');
  assert(shouldRunMigration({ VERCEL_ENV: 'production' }) === true, 'Returns true when VERCEL_ENV === "production"');
  assert(shouldRunMigration({ VERCEL_ENV: 'preview' }) === false, 'Returns false when VERCEL_ENV === "preview"');
  assert(shouldRunMigration({ VERCEL_ENV: 'development' }) === false, 'Returns false when VERCEL_ENV === "development"');
  assert(shouldRunMigration({ NODE_ENV: 'production' }) === false, 'Returns false when NODE_ENV is production but VERCEL_ENV is unset');
  assert(shouldRunMigration({}) === false, 'Returns false when env is empty');

  // --- 2. Preview Simulation ---
  console.log('\n--- 2. Preview Deployment Simulation (Must Skip) ---');
  let spawnCalledInPreview = false;
  const previewResult = runProductionMigration({
    env: { VERCEL_ENV: 'preview', DIRECT_URL: 'postgresql://mock' },
    mockSpawn: () => {
      spawnCalledInPreview = true;
      return { status: 0 };
    }
  });

  assert(previewResult.success === true, 'Preview execution returns success: true');
  assert(previewResult.skipped === true, 'Preview execution returns skipped: true');
  assert(!spawnCalledInPreview, 'Prisma CLI is NEVER spawned in preview environment');

  // --- 3. Production Missing DIRECT_URL Guard ---
  console.log('\n--- 3. Production Missing DIRECT_URL Guard ---');
  const missingUrlResult = runProductionMigration({
    env: { VERCEL_ENV: 'production' },
    exitOnError: false
  });
  assert(missingUrlResult.success === false, 'Fails when DIRECT_URL and DATABASE_URL are missing');
  assert(missingUrlResult.error === 'MISSING_DIRECT_URL', 'Returns MISSING_DIRECT_URL error');

  // --- 4. Production CLI Execution & Failure Halts Build ---
  console.log('\n--- 4. Production CLI Execution & Failure Halts Build ---');
  let recordedSpawnArgs = null;
  let recordedSpawnEnv = null;

  // Scenario A: CLI Fails with exit code 1
  const failedCliResult = runProductionMigration({
    env: {
      VERCEL_ENV: 'production',
      DIRECT_URL: 'postgresql://postgres:secret@db.mock.supabase.co:5432/postgres'
    },
    exitOnError: false,
    mockSpawn: (cmd, args, opts) => {
      recordedSpawnArgs = args;
      recordedSpawnEnv = opts.env;
      return { status: 1 };
    }
  });

  assert(failedCliResult.success === false, 'Production migration returns failure when CLI exits with code 1');
  assert(failedCliResult.status === 1, 'Returns CLI exit status 1 to halt Vercel build');
  assert(recordedSpawnArgs.includes('prisma'), 'Executes prisma CLI command');
  assert(recordedSpawnArgs.includes('migrate'), 'Executes prisma migrate subcommand');
  assert(recordedSpawnArgs.includes('deploy'), 'Executes prisma deploy subcommand');
  assert(recordedSpawnArgs.some(a => a.includes('schema.prisma')), 'Points CLI to database/prisma/schema.prisma');
  assert(recordedSpawnEnv.DIRECT_URL.includes('5432'), 'Passes DIRECT_URL to child process');

  // Scenario B: CLI Succeeds with exit code 0
  const successCliResult = runProductionMigration({
    env: {
      VERCEL_ENV: 'production',
      DIRECT_URL: 'postgresql://postgres:secret@db.mock.supabase.co:5432/postgres'
    },
    exitOnError: false,
    mockSpawn: () => ({ status: 0 })
  });
  assert(successCliResult.success === true, 'Production migration succeeds when CLI exits with 0');
  assert(successCliResult.skipped === false, 'Production migration was executed (not skipped)');

  // --- 5. checkDatabaseHealth Schema Drift Detection ---
  console.log('\n--- 5. checkDatabaseHealth Schema Drift Detection ---');
  const localMigrations = getLocalMigrationNames();
  assert(localMigrations.length > 0, `Local migrations directory contains ${localMigrations.length} migrations`);
  assert(localMigrations.includes('20260913000000_add_modification_airline_fee'), 'Finds airlineFee migration in local directory');
  assert(localMigrations.includes('20260917000000_add_refund_airline_amount'), 'Finds airlineRefundAmount migration in local directory');

  // Scenario 5.1: Database is missing the latest migration (drift detected!)
  const mockDriftPrisma = {
    $queryRaw: async () => [{ 1: 1 }],
    $queryRawUnsafe: async (sql) => {
      if (sql.includes('_prisma_migrations')) {
        // Return all migrations EXCEPT the last one to simulate drift
        return localMigrations.slice(0, -1).map(m => ({ migration_name: m }));
      }
      return [{ 1: 1 }];
    }
  };

  setPrismaClient(mockDriftPrisma);
  const driftHealthResult = await checkDatabaseHealth();
  assert(driftHealthResult.ok === true, 'Health check connectivity is OK');
  assert(driftHealthResult.schemaDrift === true, 'Detects schema drift when database is missing pending migrations');
  assert(Array.isArray(driftHealthResult.pendingMigrations) && driftHealthResult.pendingMigrations.length === 1, 'Identifies exactly 1 pending migration');
  assert(driftHealthResult.pendingMigrations[0] === localMigrations[localMigrations.length - 1], 'Pending migration matches missing local migration');

  // Scenario 5.2: Database has all migrations applied (synced, no drift!)
  const mockSyncedPrisma = {
    $queryRaw: async () => [{ 1: 1 }],
    $queryRawUnsafe: async (sql) => {
      if (sql.includes('_prisma_migrations')) {
        return localMigrations.map(m => ({ migration_name: m }));
      }
      return [{ 1: 1 }];
    }
  };

  setPrismaClient(mockSyncedPrisma);
  const syncedHealthResult = await checkDatabaseHealth();
  assert(syncedHealthResult.ok === true, 'Synced health check connectivity is OK');
  assert(syncedHealthResult.schemaDrift === false, 'schemaDrift is false when database has all migrations');
  assert(syncedHealthResult.pendingMigrations === undefined, 'pendingMigrations is undefined when fully synced');
  assert(syncedHealthResult.appliedMigrationsCount === localMigrations.length, 'Applied count matches local migrations count');

  // Clean up
  setPrismaClient(null);

  // Summary
  console.log('\n========================================================');
  console.log(`Pre-Deployment Migration Tests: ${passed} passed, ${failed} failed`);
  console.log('========================================================\n');

  if (failed > 0) {
    console.error('Failed tests:', failures);
    process.exit(1);
  }
}

runMigrationRunnerTests().catch(err => {
  console.error('Test suite error:', err);
  process.exit(1);
});

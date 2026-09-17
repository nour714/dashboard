#!/usr/bin/env node
/**
 * AfricaTravel — Production Database Migration Deployment Script
 *
 * Invoked via "postinstall" in package.json during Vercel deployments.
 * NOTE: Invoked via postinstall (rather than "build") because vercel.json uses legacy
 * "builds" with @vercel/node, which bypasses package.json "build" script on Vercel.
 *
 * Rules:
 * 1. If VERCEL_ENV === 'production':
 *    Executes `npx prisma migrate deploy` using DIRECT_URL (direct port 5432, avoiding PgBouncer transaction locks).
 *    If migration fails, exits with non-zero code to immediately halt the Vercel build.
 * 2. If VERCEL_ENV !== 'production' (e.g. preview, development, local):
 *    Prints an informational message and exits cleanly (0) to protect production data from preview branches.
 */

import { spawnSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '../../');
const SCHEMA_PATH = path.resolve(ROOT_DIR, 'database/prisma/schema.prisma');

export function shouldRunMigration(env = process.env) {
  return env.VERCEL_ENV === 'production';
}

export function runProductionMigration(options = {}) {
  const env = options.env || process.env;

  console.log('\n📦 ========================================================');
  console.log('   AfricaTravel — Pre-Deployment Migration Runner');
  console.log('========================================================\n');

  if (!shouldRunMigration(env)) {
    const currentEnv = env.VERCEL_ENV || (env.NODE_ENV === 'production' ? 'non-vercel-production' : 'development/preview');
    console.log(`ℹ️  [migrate-if-production] Current environment is "${currentEnv}".`);
    console.log('⏩ [migrate-if-production] Skipping production database migration (runs only when VERCEL_ENV === "production").\n');
    return { success: true, skipped: true };
  }

  console.log('🚀 [migrate-if-production] VERCEL_ENV is "production". Applying pending Prisma migrations to production database...');

  // Resolve direct database URL (migrations require direct port 5432 connection, avoiding PgBouncer transaction locks)
  let directUrl = env.DIRECT_URL || env.POSTGRES_URL_NON_POOLING || env.DATABASE_URL;

  if (directUrl && directUrl.includes('[YOUR-PASSWORD]') && env.POSTGRES_PASSWORD) {
    directUrl = directUrl.replace('[YOUR-PASSWORD]', encodeURIComponent(env.POSTGRES_PASSWORD));
  }

  if (!directUrl) {
    console.error('❌ [migrate-if-production] Error: DIRECT_URL (or DATABASE_URL) is not configured.');
    console.error('   Migrations cannot be deployed without a valid direct database connection string.');
    if (options.exitOnError !== false) {
      process.exit(1);
    }
    return { success: false, error: 'MISSING_DIRECT_URL' };
  }

  const maskedUrl = directUrl.replace(/:[^:@]+@/, ':****@');
  console.log(`🔗 [migrate-if-production] Using database target: ${maskedUrl}`);

  const childEnv = {
    ...env,
    DATABASE_URL: directUrl,
    DIRECT_URL: directUrl
  };

  const isWindows = process.platform === 'win32';
  const npxCmd = isWindows ? 'npx.cmd' : 'npx';

  const args = [
    'prisma',
    'migrate',
    'deploy',
    `--schema=${SCHEMA_PATH}`
  ];

  console.log(`▶️  [migrate-if-production] Executing: npx prisma migrate deploy --schema=${SCHEMA_PATH}`);

  const result = (options.mockSpawn || spawnSync)(npxCmd, args, {
    cwd: ROOT_DIR,
    env: childEnv,
    stdio: 'inherit',
    shell: isWindows
  });

  if (result.error) {
    console.error('❌ [migrate-if-production] Failed to execute Prisma CLI:', result.error.message);
    if (options.exitOnError !== false) {
      process.exit(1);
    }
    return { success: false, error: result.error };
  }

  if (result.status !== 0) {
    console.error(`\n❌ [migrate-if-production] Prisma migrate deploy failed with exit code ${result.status}.`);
    console.error('🛑 [migrate-if-production] Halting build to prevent deployment of code with unmigrated schema drift.\n');
    if (options.exitOnError !== false) {
      process.exit(result.status || 1);
    }
    return { success: false, status: result.status };
  }

  console.log('✅ [migrate-if-production] All pending production database migrations applied successfully.\n');
  return { success: true, skipped: false };
}

// If executed directly from CLI
if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  runProductionMigration();
}

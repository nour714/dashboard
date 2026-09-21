/**
 * AfricaTravel - Database Connection & Prisma Client Singleton
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { PrismaClient } from '@prisma/client';
import { env } from './env.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let prismaInstance = null;

/**
 * Returns the sorted list of local migration directory names
 * @returns {string[]}
 */
export function getLocalMigrationNames() {
  try {
    const candidateDirs = [
      path.resolve(process.cwd(), 'database/prisma/migrations'),
      path.resolve(__dirname, '../../../database/prisma/migrations')
    ];
    for (const dir of candidateDirs) {
      if (fs.existsSync(dir)) {
        return fs.readdirSync(dir, { withFileTypes: true })
          .filter(entry => entry.isDirectory())
          .map(entry => entry.name)
          .sort();
      }
    }
  } catch (e) {
    console.warn('[DatabaseHealth] Could not read local migrations directory:', e.message);
  }
  return [];
}

/**
 * Returns the PrismaClient singleton instance
 * @returns {PrismaClient}
 */
export function getPrismaClient() {
  if (!prismaInstance) {
    prismaInstance = new PrismaClient({
      datasources: {
        db: {
          url: env.DATABASE_URL
        }
      },
      log: env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error']
    });
  }
  return prismaInstance;
}

/**
 * Sets or overrides the PrismaClient instance (useful for testing)
 * @param {PrismaClient|object} client
 */
export function setPrismaClient(client) {
  prismaInstance = client;
}

/**
 * Transient database error codes & patterns for PgBouncer / serverless environments
 */
const TRANSIENT_ERROR_CODES = ['P2024', 'P1001', 'P1002', 'P1008', 'P1017'];

/**
 * Determines whether a database error is transient (connection pool timeout, connection refused, etc.)
 * @param {Error|any} err
 * @returns {boolean}
 */
export function isTransientDbError(err) {
  if (!err) return false;
  if (err.code && TRANSIENT_ERROR_CODES.includes(err.code)) return true;

  const msg = (err.message || '').toLowerCase();
  return (
    msg.includes('connection pool') ||
    msg.includes('timed out fetching a new connection') ||
    msg.includes('connection refused') ||
    msg.includes('econnrefused') ||
    msg.includes('econnreset') ||
    msg.includes('etimedout') ||
    msg.includes("can't reach database server") ||
    msg.includes('cant reach database server') ||
    msg.includes('server has closed the connection')
  );
}

/**
 * Executes a database operation with an automatic single retry on transient connection / pool timeout errors.
 * @template T
 * @param {() => Promise<T>} operation
 * @param {object} [options]
 * @param {number} [options.delayMs=250]
 * @param {string} [options.context='Database operation']
 * @returns {Promise<T>}
 */
export async function withDbRetry(operation, options = {}) {
  const delayMs = options.delayMs ?? 250;
  const context = options.context || 'Database operation';

  try {
    return await operation();
  } catch (err) {
    if (isTransientDbError(err)) {
      console.warn(`[DbRetry] Transient database error in ${context} (${err.code || err.message}). Retrying once after ${delayMs}ms...`);
      await new Promise(resolve => setTimeout(resolve, delayMs));
      return await operation();
    }
    throw err;
  }
}

/**
 * Executes a serializable transaction with automatic exponential retry on serialization
 * conflicts / deadlock errors (Prisma error P2034 or PostgreSQL 40001).
 *
 * @template T
 * @param {() => Promise<T>} operation
 * @param {object} [options]
 * @param {number} [options.maxRetries=3]
 * @param {number} [options.baseDelayMs=50]
 * @param {string} [options.context='Serializable Transaction']
 * @returns {Promise<T>}
 */
export async function withSerializableRetry(operation, options = {}) {
  const maxRetries = options.maxRetries ?? 3;
  const baseDelayMs = options.baseDelayMs ?? 50;
  const context = options.context || 'Serializable Transaction';

  let lastError;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (err) {
      lastError = err;
      const isSerializationFailure = err?.code === 'P2034' ||
        err?.message?.includes('P2034') ||
        err?.message?.includes('could not serialize access') ||
        err?.message?.includes('Transaction failed due to a write conflict or a deadlock');

      if (isSerializationFailure && attempt < maxRetries) {
        const delay = baseDelayMs * Math.pow(2, attempt - 1) + Math.floor(Math.random() * 25);
        console.warn(`[SerializableRetry] Conflict in ${context} (attempt ${attempt}/${maxRetries}). Retrying after ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      throw err;
    }
  }
  throw lastError;
}

/**
 * Checks connection health to PostgreSQL database and detects schema/migration drift
 * @returns {Promise<object>}
 */
export async function checkDatabaseHealth() {
  try {
    const client = getPrismaClient();
    await withDbRetry(() => client.$queryRaw`SELECT 1`, { context: 'healthCheck', delayMs: 150 });

    let schemaDrift = false;
    let pendingMigrations = [];
    let appliedCount = 0;
    const localMigrations = getLocalMigrationNames();

    try {
      // Query Prisma's internal migrations tracking table to detect schema drift
      let rows = null;
      if (typeof client.$queryRawUnsafe === 'function') {
        rows = await client.$queryRawUnsafe('SELECT migration_name FROM _prisma_migrations WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL');
      } else if (typeof client.$queryRaw === 'function') {
        rows = await client.$queryRaw`SELECT migration_name FROM _prisma_migrations WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL`;
      }

      if (Array.isArray(rows)) {
        const appliedSet = new Set(rows.map(r => r.migration_name));
        appliedCount = appliedSet.size;
        pendingMigrations = localMigrations.filter(m => !appliedSet.has(m));

        if (pendingMigrations.length > 0) {
          schemaDrift = true;
          console.warn('\n⚠️  ======================= DATABASE SCHEMA DRIFT WARNING =======================');
          console.warn(`[DatabaseHealth] Schema drift detected! ${pendingMigrations.length} pending migration(s) not applied to database:`);
          pendingMigrations.forEach(m => console.warn(`   • ${m}`));
          console.warn('Incoming queries expecting new schema columns/tables may fail with P2021/P2022 errors.');
          console.warn('Run "npx prisma migrate deploy" to apply pending migrations to the database.');
          console.warn('=================================================================================\n');
        }
      }
    } catch (migErr) {
      // If table _prisma_migrations does not exist (e.g. fresh DB before first migration or mock client in tests)
      // do not fail connectivity check, but log debug info
      if (migErr.code === 'P2021' || migErr.message?.includes('_prisma_migrations')) {
        console.warn('ℹ️  [DatabaseHealth] _prisma_migrations table not found in current database. Migrations may not have been initialized.');
      }
    }

    return {
      ok: true,
      schemaDrift,
      pendingMigrations: schemaDrift ? pendingMigrations : undefined,
      appliedMigrationsCount: appliedCount,
      totalMigrationsCount: localMigrations.length
    };
  } catch (err) {
    const maskedUrl = env.DATABASE_URL ? env.DATABASE_URL.replace(/:[^:@]+@/, ':****@') : 'NOT_SET';
    return { 
      ok: false, 
      error: err.message || 'Database connection error',
      code: err.code || err.name,
      dbHost: maskedUrl
    };
  }
}


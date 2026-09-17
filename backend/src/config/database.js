/**
 * AfricaTravel - Database Connection & Prisma Client Singleton
 */

import { PrismaClient } from '@prisma/client';
import { env } from './env.js';

let prismaInstance = null;

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
 * Checks connection health to PostgreSQL database
 * @returns {Promise<object>}
 */
export async function checkDatabaseHealth() {
  try {
    const client = getPrismaClient();
    await withDbRetry(() => client.$queryRaw`SELECT 1`, { context: 'healthCheck', delayMs: 150 });
    return { ok: true };
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


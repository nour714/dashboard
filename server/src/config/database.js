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
 * Checks connection health to PostgreSQL database
 * @returns {Promise<boolean>}
 */
export async function checkDatabaseHealth() {
  try {
    const client = getPrismaClient();
    await client.$queryRaw`SELECT 1`;
    return true;
  } catch (err) {
    return false;
  }
}


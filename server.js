/**
 * AfricaTravel - Main Production Server Entry Point
 *
 * Bootstraps the Express application, PostgreSQL Prisma connection, and static SPA router.
 */

import http from 'http';
import { fileURLToPath } from 'url';
import path from 'path';
import { createApp } from './server/src/app.js';
import { validatePath } from './server/src/middleware/security.js';
import { env } from './server/src/config/env.js';
import { checkDatabaseHealth } from './server/src/config/database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = __dirname;
const PORT = env.PORT || 3000;

export { validatePath };

/**
 * Creates and wraps the Express server instance
 * @param {string} rootDir
 * @returns {http.Server}
 */
export function createServer(rootDir = ROOT_DIR) {
  const app = createApp(rootDir);
  return http.createServer(app);
}

export const server = createServer(ROOT_DIR);

// Start standalone server when executed directly
if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  server.listen(PORT, '127.0.0.1', async () => {
    console.log(`\n✈️  ======================================================`);
    console.log(`   AfricaTravel Operations Platform Server`);
    console.log(`   Running at:  http://127.0.0.1:${PORT}`);
    console.log(`   API Base:    http://127.0.0.1:${PORT}/api`);
    console.log(`   Environment: ${env.NODE_ENV}`);
    console.log(`   Node.js:     ${process.version}`);
    console.log(`======================================================\n`);

    const dbHealthy = await checkDatabaseHealth();
    if (dbHealthy) {
      console.log('✅ Connected to PostgreSQL database successfully.');
    } else {
      console.log('ℹ️  PostgreSQL database connection in standby mode (using mock / fallback until DB container connects).');
    }
  });
}

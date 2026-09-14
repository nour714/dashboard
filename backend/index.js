/**
 * AfricaTravel - Backend Application Entry Point
 *
 * Exposes Express application factories, middleware, and routers.
 */

export {
  app,
  createApp,
  createApiApp,
  applyApiMiddleware,
  mountApiRoutes,
  apiNotFound
} from './src/app.js';

export { env } from './src/config/env.js';
export { getPrismaClient, checkDatabaseHealth } from './src/config/database.js';

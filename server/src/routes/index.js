/**
 * AfricaTravel - Main API Router Index
 */

import { Router } from 'express';
import authRoutes from './auth.routes.js';
import ticketRoutes from './ticket.routes.js';
import customerRoutes from './customer.routes.js';
import employeeRoutes from './employee.routes.js';
import reportRoutes from './report.routes.js';
import auditRoutes from './audit.routes.js';
import { apiRateLimiter } from '../middleware/rate-limiter.js';
import { checkDatabaseHealth } from '../config/database.js';

const apiRouter = Router();

// Apply general API rate limiter
apiRouter.use(apiRateLimiter);

// Health check endpoint
apiRouter.get('/health', async (req, res) => {
  const healthResult = await checkDatabaseHealth();
  const dbConnected = healthResult.ok;
  res.status(dbConnected ? 200 : 503).json({
    success: true,
    data: {
      status: dbConnected ? 'healthy' : 'degraded',
      database: dbConnected ? 'connected' : 'disconnected',
      details: healthResult.ok ? undefined : healthResult,
      timestamp: new Date().toISOString()
    }
  });
});

// Mount Sub-routers
apiRouter.use('/auth', authRoutes);
apiRouter.use('/tickets', ticketRoutes);
apiRouter.use('/customers', customerRoutes);
apiRouter.use('/employees', employeeRoutes);
apiRouter.use('/reports', reportRoutes);
apiRouter.use('/activity', auditRoutes);

export default apiRouter;

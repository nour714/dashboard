/**
 * Vercel Serverless Function Handler
 * Dedicated API handler for Vercel deployment
 */

import express from 'express';
import apiRouter from '../server/src/routes/index.js';
import { applyApiMiddleware } from '../server/src/app.js';
import { errorHandler } from '../server/src/middleware/error-handler.js';

const app = express();

// Apply centralized API middleware pipeline
applyApiMiddleware(app);

// Handle API requests with or without /api prefix
app.use('/api', apiRouter);
app.use('/', (req, res, next) => {
  const isApiSubpath = ['/auth', '/tickets', '/customers', '/employees', '/reports', '/activity', '/health'].some(p => req.path.startsWith(p));
  if (isApiSubpath) {
    return apiRouter(req, res, next);
  }
  next();
});

// Fallback for unmatched API routes
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: {
      message: `API endpoint ${req.method} ${req.originalUrl} not found`,
      code: 'ROUTE_NOT_FOUND'
    }
  });
});

app.use(errorHandler);

export default app;

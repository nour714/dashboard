/**
 * Vercel Serverless Function Handler
 * Dedicated API handler for Vercel deployment
 */

import express from 'express';
import apiRouter from '../server/src/routes/index.js';
import { helmetMiddleware, corsMiddleware } from '../server/src/middleware/security.js';
import { errorHandler } from '../server/src/middleware/error-handler.js';

const app = express();

app.use(helmetMiddleware);
app.use(corsMiddleware);
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));

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

export default async function handler(req, res) {
  try {
    return app(req, res);
  } catch (err) {
    console.error('Serverless Invocation Error:', err);
    return res.status(500).json({
      success: false,
      error: {
        message: err?.message || 'Serverless Handler Error'
      }
    });
  }
}

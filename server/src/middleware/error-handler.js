/**
 * AfricaTravel - Centralized Global Error Handler Middleware
 *
 * Catches all domain errors, validation errors, auth exceptions, and unexpected
 * server errors, formatting them into standard JSON error contract responses.
 */

import { AppError } from '../domain/errors.js';
import { env } from '../config/env.js';

export function errorHandler(err, req, res, next) {
  // If response headers have already been sent, delegate to default Express handler
  if (res.headersSent) {
    return next(err);
  }

  // Handle Domain / App Errors
  if (err instanceof AppError) {
    return res.status(err.statusCode || 400).json({
      success: false,
      error: {
        message: err.message,
        code: err.code || 'APP_ERROR',
        field: err.field || null,
        details: Object.keys(err.details || {}).length > 0 ? err.details : undefined
      }
    });
  }

  // Handle JSON parsing errors in body-parser
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({
      success: false,
      error: {
        message: 'Malformed JSON payload in request body',
        code: 'INVALID_JSON'
      }
    });
  }

  // Handle Prisma Known Request Errors (e.g. Unique constraint violation P2002)
  if (err.code === 'P2002') {
    const target = Array.isArray(err.meta?.target) ? err.meta.target.join(', ') : 'field';
    return res.status(409).json({
      success: false,
      error: {
        message: `A record with this ${target} already exists.`,
        code: 'UNIQUE_CONSTRAINT_VIOLATION',
        field: target
      }
    });
  }

  if (err.code === 'P2025') {
    return res.status(404).json({
      success: false,
      error: {
        message: err.meta?.cause || 'Requested record was not found in the database.',
        code: 'NOT_FOUND'
      }
    });
  }

  // Handle Prisma Database Connection Errors
  if (err.name === 'PrismaClientInitializationError' || err.code === 'P1001' || err.message?.includes('database server')) {
    return res.status(503).json({
      success: false,
      error: {
        message: 'Cannot connect to PostgreSQL database. Please ensure DATABASE_URL is properly configured in Vercel environment variables.',
        code: 'DATABASE_UNAVAILABLE'
      }
    });
  }

  // Log unexpected server errors
  console.error('🔥 Unexpected Error:', err);

  const statusCode = err.status || err.statusCode || 500;
  return res.status(statusCode).json({
    success: false,
    error: {
      message: env.NODE_ENV === 'production' ? 'An unexpected internal server error occurred' : (err.message || 'Internal Server Error'),
      code: 'INTERNAL_SERVER_ERROR',
      stack: env.NODE_ENV === 'development' ? err.stack : undefined
    }
  });
}

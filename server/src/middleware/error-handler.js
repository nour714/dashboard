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

  // Handle Multer file upload errors
  if (err.name === 'MulterError' || err.code === 'LIMIT_FILE_SIZE') {
    const messages = {
      LIMIT_FILE_SIZE: 'File size exceeds the 5MB limit.',
      LIMIT_FILE_COUNT: 'Too many files uploaded.',
      LIMIT_UNEXPECTED_FILE: 'Unexpected file field name.'
    };
    return res.status(400).json({
      success: false,
      error: {
        message: messages[err.code] || 'File upload error.',
        code: 'FILE_UPLOAD_ERROR'
      }
    });
  }

  // Handle custom file validation errors (INVALID_FILE_TYPE from multer fileFilter)
  if (err.code === 'INVALID_FILE_TYPE' || err.message === 'INVALID_FILE_TYPE') {
    return res.status(400).json({
      success: false,
      error: {
        message: 'Invalid file type. Only JPEG, PNG, and PDF files are allowed.',
        code: 'INVALID_FILE_TYPE'
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

  // Handle Prisma Database Connection, Initialization & Schema Errors
  if (
    err.name === 'PrismaClientInitializationError' ||
    err.name === 'PrismaClientRustPanicError' ||
    err.name === 'PrismaClientUnknownRequestError' ||
    ['P1000', 'P1001', 'P1002', 'P1003', 'P1008', 'P1011', 'P1017', 'P2021', 'P2022'].includes(err.code) ||
    err.message?.includes("Can't reach database server") ||
    err.message?.includes('database server') ||
    err.message?.includes('Connection pool') ||
    err.message?.includes('does not exist in the current database')
  ) {
    const isMissingTableOrColumn = err.code === 'P2021' || err.code === 'P2022' || err.message?.includes('does not exist in the current database');
    console.error('❌ Database error:', err.message);
    return res.status(503).json({
      success: false,
      error: {
        message: isMissingTableOrColumn
          ? 'Database schema requires migration. A table or column does not exist in the connected database.'
          : 'Cannot connect to PostgreSQL database. Please ensure DATABASE_URL is reachable and configured.',
        code: isMissingTableOrColumn ? 'DATABASE_MIGRATION_REQUIRED' : 'DATABASE_UNAVAILABLE',
        details: env.NODE_ENV === 'development' ? err.message : undefined
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
      details: env.NODE_ENV === 'development' ? err.message : undefined,
      stack: env.NODE_ENV === 'development' ? err.stack : undefined
    }
  });
}

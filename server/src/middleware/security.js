/**
 * AfricaTravel - Security Middleware & Static File Validation
 *
 * Configures Helmet headers, CORS policies, and path traversal / dotfile protection.
 */

import helmet from 'helmet';
import cors from 'cors';
import path from 'path';
import { env } from '../config/env.js';

export const helmetMiddleware = helmet({
  contentSecurityPolicy: false, // Allows inline scripts/styles for Vanilla JS SPA components
  crossOriginEmbedderPolicy: false
});

export const corsMiddleware = cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (e.g. mobile apps, curl, same-origin server-side requests)
    if (!origin) return callback(null, true);

    const normalizedOrigin = origin.replace(/\/+$/, '');
    const allowedOrigins = env.CORS_ORIGIN 
      ? env.CORS_ORIGIN.split(',').map(s => s.trim().replace(/\/+$/, '')).filter(Boolean)
      : [];
    
    // In development/test, permit localhost / 127.0.0.1 origins
    const isDevelopment = env.NODE_ENV !== 'production';
    const isLocalhost = isDevelopment && (normalizedOrigin.includes('localhost') || normalizedOrigin.includes('127.0.0.1'));

    if (
      allowedOrigins.includes('*') ||
      allowedOrigins.includes(normalizedOrigin) ||
      isLocalhost
    ) {
      return callback(null, true);
    }
    return callback(new Error(`Origin ${origin} is not allowed by CORS`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
});

/**
 * Validates whether a pathname is safe to serve from a root directory.
 * Prevents path traversal and blocks dotfile / dotfolder access (.git, .env, etc.).
 * @param {string} pathname
 * @param {string} [rootDir=process.cwd()]
 * @returns {{ isSafe: boolean, resolvedPath: string, reason?: string }}
 */
export function validatePath(pathname, rootDir = process.cwd()) {
  const resolvedRoot = path.resolve(rootDir);

  // Split and check for dotfile/dotfolder segments
  const segments = pathname.split(/[/\\]/).filter(Boolean);
  const hasDotSegment = segments.some(seg => seg.startsWith('.'));
  if (hasDotSegment) {
    return { isSafe: false, resolvedPath: '', reason: 'dotfile_blocked' };
  }

  // Resolve target path safely relative to root
  const resolvedPath = path.resolve(resolvedRoot, '.' + path.sep + pathname);

  // Check if resolved path stays strictly within resolvedRoot
  const isInsideRoot = resolvedPath === resolvedRoot || resolvedPath.startsWith(resolvedRoot + path.sep);
  if (!isInsideRoot) {
    return { isSafe: false, resolvedPath: '', reason: 'path_traversal' };
  }

  return { isSafe: true, resolvedPath };
}

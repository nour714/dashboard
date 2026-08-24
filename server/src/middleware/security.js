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
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:'],
      imgSrc: ["'self'", 'data:', 'blob:', 'https://*.supabase.co'],
      connectSrc: ["'self'", 'https://*.supabase.co', 'https://*.vercel.app'],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"]
    }
  },
  crossOriginEmbedderPolicy: false
});

export const corsMiddleware = cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    const normalizedOrigin = origin.replace(/\/+$/, '');

    const allowedOrigins = env.CORS_ORIGIN
      ? env.CORS_ORIGIN.split(',').map(s => s.trim().replace(/\/+$/, ''))
      : [];

    // Vercel injects these automatically per-deployment; they identify
    // THIS project's own domains only (not arbitrary *.vercel.app sites).
    const vercelSystemDomains = [
      process.env.VERCEL_URL,
      process.env.VERCEL_PROJECT_PRODUCTION_URL,
      process.env.VERCEL_BRANCH_URL
    ]
      .filter(Boolean)
      .map(d => `https://${d}`.replace(/\/+$/, ''));

    const isDevelopment = env.NODE_ENV !== 'production';
    const isLocalhost = isDevelopment && (normalizedOrigin.includes('localhost') || normalizedOrigin.includes('127.0.0.1'));

    if (
      allowedOrigins.includes('*') ||
      allowedOrigins.includes(normalizedOrigin) ||
      vercelSystemDomains.includes(normalizedOrigin) ||
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

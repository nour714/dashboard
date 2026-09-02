/**
 * AfricaTravel - Express Application Configuration
 *
 * Configures middleware pipeline, API routing, static frontend asset serving,
 * path traversal protection, SPA routing fallback, and centralized error handling.
 */

import express from 'express';
import path from 'path';

import { fileURLToPath } from 'url';
import cookieParser from 'cookie-parser';
import apiRouter from './routes/index.js';
import { helmetMiddleware, corsMiddleware, validatePath } from './middleware/security.js';
import { errorHandler } from './middleware/error-handler.js';
import { env, configErrors } from './config/env.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '../../');



/**
 * Attaches common API middleware pipeline (security, body parsers, cookie parser, env guard)
 * @param {import('express').Express} app
 */
export function applyApiMiddleware(app) {
  // Trust proxy for rate-limiter and IP extraction behind reverse proxies
  const trustProxySetting = process.env.TRUST_PROXY
    ? (process.env.TRUST_PROXY === 'true' ? true : (process.env.TRUST_PROXY === 'false' ? false : (!isNaN(Number(process.env.TRUST_PROXY)) ? Number(process.env.TRUST_PROXY) : process.env.TRUST_PROXY)))
    : 1;
  app.set('trust proxy', trustProxySetting);

  // Security Headers and CORS
  app.use(helmetMiddleware);
  app.use(corsMiddleware);
  app.use(cookieParser());

  // Environment Configuration Guard (Early fail-closed with generic JSON error for clients)
  app.use((req, res, next) => {
    if (configErrors.length > 0 && env.NODE_ENV === 'production' && req.path !== '/api/health' && req.path !== '/health') {
      return res.status(503).json({
        success: false,
        error: {
          message: 'Server environment configuration error. Please check server logs.',
          code: 'ENVIRONMENT_CONFIG_ERROR'
        }
      });
    }
    next();
  });

  // Body Parsers
  app.use(express.json({ limit: '2mb' }));
  app.use(express.urlencoded({ extended: true, limit: '2mb' }));
}

export function createApp(rootDir = ROOT_DIR) {
  const app = express();

  // Apply shared API middleware pipeline
  applyApiMiddleware(app);

  // Mount API Endpoints (supports both /api prefix and stripped serverless routes)
  app.use('/api', apiRouter);
  app.use((req, res, next) => {
    const isApiSubpath = ['/auth', '/tickets', '/customers', '/employees', '/reports', '/activity', '/health'].some(p => req.path.startsWith(p));
    if (isApiSubpath) {
      return apiRouter(req, res, next);
    }
    next();
  });

  // Security guard for static assets & frontend: block path traversal & dotfiles
  app.use((req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    const rawPath = req.originalUrl || req.url || req.path;
    const pathnameRaw = decodeURIComponent(rawPath.split('?')[0]);
    const pathnameReq = decodeURIComponent(req.path);
    const v1 = validatePath(pathnameRaw === '/' ? '/index.html' : pathnameRaw, rootDir);
    const v2 = validatePath(pathnameReq === '/' ? '/index.html' : pathnameReq, rootDir);
    if (!v1.isSafe || !v2.isSafe) {
      return res.status(403).type('text/plain').send('403 Forbidden');
    }
    next();
  });

  // Static Frontend Assets with proper Cache-Control using express.static
  app.use(express.static(rootDir, {
    maxAge: '1d',
    immutable: false,
    dotfiles: 'deny',
    index: false, // Handled separately for SPA fallback
    setHeaders(res, filePath) {
      const ext = path.extname(filePath).toLowerCase();
      if (ext === '.html' || path.basename(filePath) === 'sw.js') {
        res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
        res.set('Pragma', 'no-cache');
        res.set('Expires', '0');
        if (path.basename(filePath) === 'sw.js') {
          res.set('Service-Worker-Allowed', '/');
        }
      }
      res.set('X-Content-Type-Options', 'nosniff');
    }
  }));

  // SPA Fallback — serve index.html for unmatched non-API, non-file routes
  app.use((req, res) => {
    // Skip API routes that weren't matched
    if (req.path.startsWith('/api')) {
      return res.status(404).json({
        success: false,
        error: {
          message: `API endpoint ${req.method} ${req.originalUrl} not found`,
          code: 'ROUTE_NOT_FOUND'
        }
      });
    }

    // Only fallback for extensionless paths (client-side routes)
    if (path.extname(req.path)) {
      return res.status(404).type('text/plain').send('404 Not Found');
    }

    const indexPath = path.join(rootDir, 'index.html');
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    res.set('X-Content-Type-Options', 'nosniff');
    res.sendFile(indexPath, (err) => {
      if (err) {
        res.status(404).type('text/plain').send('404 Not Found');
      }
    });
  });

  // Global Error Handler
  app.use(errorHandler);

  return app;
}

export const app = createApp();

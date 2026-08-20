/**
 * AfricaTravel - Express Application Configuration
 *
 * Configures middleware pipeline, API routing, static frontend asset serving,
 * path traversal protection, SPA routing fallback, and centralized error handling.
 */

import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import apiRouter from './routes/index.js';
import { helmetMiddleware, corsMiddleware, validatePath } from './middleware/security.js';
import { errorHandler } from './middleware/error-handler.js';
import { env } from './config/env.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '../../');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.ttf': 'font/ttf'
};

export function createApp(rootDir = ROOT_DIR) {
  const app = express();

  // Trust proxy for rate-limiter and IP extraction behind reverse proxies
  app.set('trust proxy', 1);

  // Security Headers and CORS
  app.use(helmetMiddleware);
  app.use(corsMiddleware);

  // Body Parsers
  app.use(express.json({ limit: '2mb' }));
  app.use(express.urlencoded({ extended: true, limit: '2mb' }));

  // Mount API Endpoints
  app.use('/api', apiRouter);

  // Static Frontend Assets & SPA Fallback Handler
  app.use((req, res, next) => {
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

    let pathname = decodeURIComponent(req.path);
    if (pathname === '/') {
      pathname = '/index.html';
    }

    // Security Check: Path Traversal & Dotfile/Dotfolder Prevention
    const pathValidation = validatePath(pathname, rootDir);
    if (!pathValidation.isSafe) {
      res.status(403).type('text/plain').send('403 Forbidden');
      return;
    }

    let filePath = pathValidation.resolvedPath;

    fs.stat(filePath, (err, stats) => {
      if (err || !stats.isFile()) {
        // SPA Fallback for client-side routing
        if (!path.extname(pathname)) {
          const indexValidation = validatePath('/index.html', rootDir);
          if (!indexValidation.isSafe) {
            res.status(403).type('text/plain').send('403 Forbidden');
            return;
          }
          filePath = indexValidation.resolvedPath;
        } else {
          res.status(404).type('text/plain').send('404 Not Found');
          return;
        }
      }

      const ext = path.extname(filePath).toLowerCase();
      const contentType = MIME_TYPES[ext] || 'application/octet-stream';

      fs.readFile(filePath, (readErr, content) => {
        if (readErr) {
          res.status(500).type('text/plain').send('500 Internal Server Error');
          return;
        }

        res.set({
          'Content-Type': contentType,
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
          'Pragma': 'no-cache',
          'Expires': '0',
          'X-Content-Type-Options': 'nosniff'
        });
        res.status(200).send(content);
      });
    });
  });

  // Global Error Handler
  app.use(errorHandler);

  return app;
}

export const app = createApp();

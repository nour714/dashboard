import http from 'http';
import fs from 'fs';
import path from 'path';
import url, { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;
const ROOT_DIR = __dirname;

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

/**
 * Validates whether a pathname is safe to serve from the root directory.
 * Prevents path traversal and blocks any dotfile/dotfolder access (.git, .env, etc.).
 * @param {string} pathname
 * @param {string} rootDir
 * @returns {{ isSafe: boolean, resolvedPath: string, reason?: string }}
 */
export function validatePath(pathname, rootDir = ROOT_DIR) {
  const resolvedRoot = path.resolve(rootDir);

  // Split and check for dotfile/dotfolder segments (e.g., .git, .env, ..)
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

export function createServer(rootDir = ROOT_DIR) {
  return http.createServer((req, res) => {
    const parsedUrl = url.parse(req.url);
    let pathname = decodeURIComponent(parsedUrl.pathname);

    // If root, serve index.html
    if (pathname === '/') {
      pathname = '/index.html';
    }

    // Security Check: Path Traversal & Dotfile/Dotfolder Prevention
    const pathValidation = validatePath(pathname, rootDir);
    if (!pathValidation.isSafe) {
      res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('403 Forbidden');
      return;
    }

    let filePath = pathValidation.resolvedPath;

    fs.stat(filePath, (err, stats) => {
      if (err || !stats.isFile()) {
        // If requested file doesn't exist and has no extension, fallback to index.html for SPA
        if (!path.extname(pathname)) {
          const indexValidation = validatePath('/index.html', rootDir);
          if (!indexValidation.isSafe) {
            res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
            res.end('403 Forbidden');
            return;
          }
          filePath = indexValidation.resolvedPath;
        } else {
          res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
          res.end('404 Not Found');
          return;
        }
      }

      const ext = path.extname(filePath).toLowerCase();
      const contentType = MIME_TYPES[ext] || 'application/octet-stream';

      fs.readFile(filePath, (readErr, content) => {
        if (readErr) {
          res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
          res.end('500 Internal Server Error');
          return;
        }
        res.writeHead(200, {
          'Content-Type': contentType,
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
          'Pragma': 'no-cache',
          'Expires': '0',
          'X-Content-Type-Options': 'nosniff'
        });
        res.end(content);
      });
    });
  });
}

const server = createServer();

// Start standalone server when executed directly
if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  server.listen(PORT, '127.0.0.1', () => {
    console.log(`AfricaTravel server running at http://127.0.0.1:${PORT}`);
  });
}

export { server };

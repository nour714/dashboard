/**
 * AfricaTravel — PWA Installability & Service Worker Verification Tests
 *
 * Verifies:
 * 1. manifest.json schema, metadata, standalone display mode, brand colors, and icon paths
 * 2. sw.js static shell caching, network-only API routing rule, and lifecycle handlers
 * 3. Icon assets (192, 512, 512-maskable, apple-touch-icon) in assets/
 * 4. index.html manifest link, apple-touch-icon link, and iOS web-app meta tags
 * 5. vercel.json explicit routes and builds for /manifest.json and /sw.js
 * 6. js/app.js guarded service worker registration
 * 7. Express HTTP server serving /manifest.json and /sw.js with correct Content-Type and headers
 */

import fs from 'fs';
import path from 'path';
import http from 'http';
import { createApp } from '../server/src/app.js';

let passed = 0;
let failed = 0;
const failures = [];

function assert(condition, message) {
  if (condition) {
    passed++;
    console.log(`  ✓ ${message}`);
  } else {
    failed++;
    failures.push(message);
    console.error(`  ✗ ${message}`);
  }
}

async function runPwaTests() {
  console.log('\n📱 ========================================================');
  console.log('   AfricaTravel PWA & Service Worker Integration Tests');
  console.log('========================================================\n');

  // --- 1. manifest.json Validation ---
  console.log('--- 1. manifest.json Structure & Configuration ---');
  const manifestPath = path.resolve('manifest.json');
  assert(fs.existsSync(manifestPath), 'manifest.json exists at repository root');

  const manifestRaw = fs.readFileSync(manifestPath, 'utf8');
  let manifest;
  try {
    manifest = JSON.parse(manifestRaw);
    assert(true, 'manifest.json is valid JSON');
  } catch {
    assert(false, 'manifest.json is valid JSON');
  }

  if (manifest) {
    assert(manifest.name && manifest.name.includes('AfricaTravel'), 'manifest has valid application name');
    assert(manifest.short_name === 'AfricaTravel', 'manifest short_name is AfricaTravel');
    assert(manifest.start_url === '/dashboard', 'manifest start_url is /dashboard');
    assert(manifest.display === 'standalone', 'manifest display mode is standalone');
    assert(manifest.scope === '/', 'manifest scope is /');
    assert(manifest.background_color === '#131b2e', 'manifest background_color matches navy brand (#131b2e)');
    assert(manifest.theme_color === '#131b2e', 'manifest theme_color matches navy brand (#131b2e)');

    assert(Array.isArray(manifest.icons) && manifest.icons.length >= 3, 'manifest has at least 3 icon entries');
    const icon192 = manifest.icons.find(i => i.sizes === '192x192');
    const icon512 = manifest.icons.find(i => i.sizes === '512x512' && i.purpose !== 'maskable');
    const icon512Maskable = manifest.icons.find(i => i.sizes === '512x512' && i.purpose === 'maskable');

    assert(icon192 && icon192.src === '/assets/icon-192.png', '192x192 icon is configured');
    assert(icon512 && icon512.src === '/assets/icon-512.png', '512x512 icon is configured');
    assert(icon512Maskable && icon512Maskable.src === '/assets/icon-512-maskable.png', '512x512 maskable icon is configured');
  }

  // --- 2. sw.js Validation ---
  console.log('\n--- 2. Service Worker (sw.js) Verification ---');
  const swPath = path.resolve('sw.js');
  assert(fs.existsSync(swPath), 'sw.js exists at repository root');

  const swContent = fs.readFileSync(swPath, 'utf8');
  assert(swContent.includes('CACHE_NAME'), 'sw.js defines CACHE_NAME');
  assert(swContent.includes('SHELL_ASSETS'), 'sw.js defines SHELL_ASSETS');
  assert(swContent.includes("request.url.includes('/api/')"), 'sw.js explicitly bypasses /api/ requests (no stale business data)');
  assert(swContent.includes('self.addEventListener(\'install\''), 'sw.js handles install event');
  assert(swContent.includes('self.addEventListener(\'activate\''), 'sw.js handles activate event and cache cleanup');
  assert(swContent.includes('self.addEventListener(\'fetch\''), 'sw.js handles fetch event with stale-while-revalidate');

  // --- 3. Icon Assets in assets/ ---
  console.log('\n--- 3. Icon Asset Files ---');
  const iconFiles = [
    'assets/apple-touch-icon.png',
    'assets/icon-192.png',
    'assets/icon-512.png',
    'assets/icon-512-maskable.png'
  ];

  for (const iconFile of iconFiles) {
    const p = path.resolve(iconFile);
    assert(fs.existsSync(p) && fs.statSync(p).size > 1000, `${iconFile} exists and is non-empty (>1KB)`);
  }

  // --- 4. index.html Tags ---
  console.log('\n--- 4. index.html Head Metadata ---');
  const htmlContent = fs.readFileSync(path.resolve('index.html'), 'utf8');
  assert(htmlContent.includes('<link rel="manifest" href="/manifest.json"'), 'index.html links /manifest.json');
  assert(htmlContent.includes('<link rel="apple-touch-icon" href="/assets/apple-touch-icon.png"'), 'index.html links /assets/apple-touch-icon.png');
  assert(htmlContent.includes('<meta name="apple-mobile-web-app-capable" content="yes"'), 'index.html sets apple-mobile-web-app-capable');
  assert(htmlContent.includes('<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent"'), 'index.html sets apple-mobile-web-app-status-bar-style');
  assert(htmlContent.includes('<meta name="apple-mobile-web-app-title" content="AfricaTravel"'), 'index.html sets apple-mobile-web-app-title');

  // --- 5. vercel.json Routing & Builds ---
  console.log('\n--- 5. vercel.json PWA Routing ---');
  const vercelConfig = JSON.parse(fs.readFileSync(path.resolve('vercel.json'), 'utf8'));

  const manifestBuild = vercelConfig.builds?.find(b => b.src === 'manifest.json');
  const swBuild = vercelConfig.builds?.find(b => b.src === 'sw.js');
  assert(manifestBuild && manifestBuild.use === '@vercel/static', 'vercel.json builds manifest.json as static');
  assert(swBuild && swBuild.use === '@vercel/static', 'vercel.json builds sw.js as static');

  const manifestRouteIdx = vercelConfig.routes?.findIndex(r => r.src === '/manifest.json');
  const swRouteIdx = vercelConfig.routes?.findIndex(r => r.src === '/sw.js');
  const catchAllIdx = vercelConfig.routes?.findIndex(r => r.src === '/(.*)');

  assert(manifestRouteIdx !== -1, 'vercel.json has explicit /manifest.json route');
  assert(swRouteIdx !== -1, 'vercel.json has explicit /sw.js route');
  assert(manifestRouteIdx < catchAllIdx, '/manifest.json route is placed BEFORE the catch-all SPA route');
  assert(swRouteIdx < catchAllIdx, '/sw.js route is placed BEFORE the catch-all SPA route');

  // --- 6. js/app.js Registration ---
  console.log('\n--- 6. js/app.js Service Worker Registration ---');
  const appJsContent = fs.readFileSync(path.resolve('js/app.js'), 'utf8');
  assert(appJsContent.includes('serviceWorker') && appJsContent.includes('register(\'/sw.js\')'), 'js/app.js registers /sw.js');

  // --- 7. Server HTTP Endpoint Integration ---
  console.log('\n--- 7. Express HTTP Server Endpoint Tests ---');
  const app = createApp();
  const server = http.createServer(app);

  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;

  const fetchEndpoint = (urlPath) => new Promise((resolve, reject) => {
    http.get(`http://127.0.0.1:${port}${urlPath}`, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: data }));
    }).on('error', reject);
  });

  // Test /manifest.json
  const manifestRes = await fetchEndpoint('/manifest.json');
  assert(manifestRes.status === 200, 'GET /manifest.json returns HTTP 200');
  assert(manifestRes.headers['content-type']?.includes('application/json'), 'GET /manifest.json content-type is application/json');
  assert(manifestRes.body.includes('"name": "AfricaTravel'), 'GET /manifest.json returns real manifest content, not SPA HTML');

  // Test /sw.js
  const swRes = await fetchEndpoint('/sw.js');
  assert(swRes.status === 200, 'GET /sw.js returns HTTP 200');
  assert(swRes.headers['content-type']?.includes('javascript'), 'GET /sw.js content-type is javascript');
  assert(swRes.headers['service-worker-allowed'] === '/', 'GET /sw.js includes Service-Worker-Allowed: /');
  assert(swRes.body.includes('CACHE_NAME'), 'GET /sw.js returns real service worker code, not SPA HTML');

  // Test /assets/icon-192.png
  const iconRes = await fetchEndpoint('/assets/icon-192.png');
  assert(iconRes.status === 200, 'GET /assets/icon-192.png returns HTTP 200');
  assert(iconRes.headers['content-type']?.includes('image/png'), 'GET /assets/icon-192.png content-type is image/png');

  server.close();

  // Summary
  console.log('\n========================================================');
  console.log(`PWA Integration Tests: ${passed} passed, ${failed} failed`);
  console.log('========================================================\n');

  if (failed > 0) {
    console.error('Failed tests:', failures);
    process.exit(1);
  }
}

runPwaTests().catch(err => {
  console.error('Test suite uncaught error:', err);
  process.exit(1);
});

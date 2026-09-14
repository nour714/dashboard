#!/usr/bin/env node

/**
 * AfricaTravel - Deployment Verification Script
 *
 * Checks health of a deployed instance via HTTP GET /api/health.
 *
 * Usage:
 *   node scripts/deployment/verify-deployment.js
 *   TARGET_URL=https://your-domain.com node scripts/deployment/verify-deployment.js
 */

import http from 'http';
import https from 'https';

const TARGET_URL = process.env.TARGET_URL || 'http://127.0.0.1:3000';
const healthEndpoint = `${TARGET_URL.replace(/\/+$/, '')}/api/health`;

console.log(`\n🔍 Verifying AfricaTravel deployment health at: ${healthEndpoint}`);

const client = healthEndpoint.startsWith('https') ? https : http;

const req = client.get(healthEndpoint, (res) => {
  let body = '';
  res.on('data', chunk => { body += chunk; });
  res.on('end', () => {
    if (res.statusCode === 200) {
      try {
        const json = JSON.parse(body);
        if (json.success && json.data?.status === 'ok') {
          console.log('✅ Deployment health check passed:', JSON.stringify(json.data));
          process.exit(0);
        }
      } catch {
        // Fallback for non-JSON 200
      }
      console.log('✅ Server responded with HTTP 200.');
      process.exit(0);
    } else {
      console.error(`❌ Health check failed with HTTP ${res.statusCode}: ${body}`);
      process.exit(1);
    }
  });
});

req.on('error', (err) => {
  console.error('❌ Connection error during health check:', err.message);
  process.exit(1);
});

req.setTimeout(10000, () => {
  console.error('❌ Health check timed out after 10 seconds.');
  req.destroy();
  process.exit(1);
});

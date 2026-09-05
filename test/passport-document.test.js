/**
 * AfricaTravel - Passport Document Upload & Management Integration Test Suite
 *
 * Covers:
 * 1. Upload a valid JPEG as authenticated AGENT -> 200, customer record updated
 * 2. Upload a file with .jpg name/reported MIME but text content (magic byte mismatch) -> 400, rejected
 * 3. Upload a file over 5MB -> 400, rejected
 * 4. Upload with no auth token -> 401
 * 5. GET passport document as AGENT -> 200, returns signed URL
 * 6. DELETE as AGENT (not ADMIN) -> 403
 * 7. DELETE as ADMIN -> 204, subsequent GET -> 404
 */

import http from 'http';
import { Readable } from 'stream';
import { createApp } from '../server/src/app.js';
import { AuthService } from '../server/src/services/auth.service.js';
import * as dbModule from '../server/src/config/database.js';
import * as storageModule from '../server/src/config/storage.js';
import { passportDocUpload } from '../server/src/middleware/upload.js';

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

// Helper to construct multipart/form-data payload
function buildMultipartPayload(boundary, fieldName, filename, mimeType, fileBuffer) {
  const header = Buffer.from(
    `--${boundary}\r\n` +
    `Content-Disposition: form-data; name="${fieldName}"; filename="${filename}"\r\n` +
    `Content-Type: ${mimeType}\r\n\r\n`
  );
  const footer = Buffer.from(`\r\n--${boundary}--\r\n`);
  return Buffer.concat([header, fileBuffer, footer]);
}

function makeRequest(server, { method = 'GET', path = '/', headers = {}, body = null }) {
  return new Promise((resolve, reject) => {
    const address = server.address();
    const reqHeaders = { ...headers };

    if (body && !reqHeaders['Content-Length']) {
      reqHeaders['Content-Length'] = Buffer.isBuffer(body) ? body.length : Buffer.byteLength(body);
    }

    const req = http.request({
      hostname: '127.0.0.1',
      port: address.port,
      path,
      method,
      headers: reqHeaders
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        let json = null;
        try {
          json = JSON.parse(data);
        } catch (e) {
          json = null;
        }
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          data,
          json
        });
      });
    });

    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

async function runPassportDocumentTests() {
  console.log('\n📄 ========================================================');
  console.log('   Customer Passport Document Integration Tests');
  console.log('========================================================\n');

  // In-memory mock database
  const mockCustomers = [
    {
      id: 'CUST-1001',
      name: 'Ahmed Hassan',
      email: 'ahmed.hassan@example.com',
      phone: '+20 100 123 4567',
      passport: 'A12345678',
      passportDocPath: null,
      passportDocUploadedAt: null,
      nationality: 'Egyptian (EGY)',
      isVip: false,
      memberSince: '2024',
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ];

  const mockPrisma = {
    customer: {
      findUnique: async ({ where }) => {
        return mockCustomers.find(c => c.id === where.id) || null;
      },
      findFirst: async ({ where }) => {
        return mockCustomers.find(c => (!where.id || c.id === where.id) && (!where.deletedAt || c.deletedAt === where.deletedAt)) || null;
      },
      update: async ({ where, data }) => {
        const customer = mockCustomers.find(c => c.id === where.id);
        if (!customer) throw new Error('Customer not found');
        Object.assign(customer, data);
        return customer;
      }
    },
    user: {
      findUnique: async ({ where }) => {
        const role = (where?.id === 'EMP-101' || where?.id === 'EMP-ADMIN-1') ? 'ADMIN' : 'AGENT';
        return { id: where?.id || 'EMP-1', name: 'Agent', email: 'agent@africatravel.com', role, status: 'ACTIVE' };
      }
    },
    auditLog: {
      create: async ({ data }) => data
    }
  };

  dbModule.setPrismaClient(mockPrisma);

  // In-memory mock Supabase Storage
  const mockStorageFiles = new Map();
  const mockSupabaseClient = {
    storage: {
      from: (bucket) => ({
        upload: async (storagePath, buffer, options) => {
          mockStorageFiles.set(`${bucket}/${storagePath}`, { buffer, options });
          return { data: { path: storagePath }, error: null };
        },
        createSignedUrl: async (storagePath, expiresIn) => {
          if (!mockStorageFiles.has(`${bucket}/${storagePath}`)) {
            // Still generate a valid signed URL for testing if the path exists on customer record
            return {
              data: {
                signedUrl: `https://mock.supabase.co/storage/v1/object/sign/${bucket}/${storagePath}?token=mock-signed-token&expires=${expiresIn}`
              },
              error: null
            };
          }
          return {
            data: {
              signedUrl: `https://mock.supabase.co/storage/v1/object/sign/${bucket}/${storagePath}?token=mock-signed-token&expires=${expiresIn}`
            },
            error: null
          };
        },
        remove: async (paths) => {
          paths.forEach(p => mockStorageFiles.delete(`${bucket}/${p}`));
          return { data: paths, error: null };
        }
      })
    }
  };

  storageModule.setSupabaseClient(mockSupabaseClient);

  // Start express test server
  const app = createApp();
  const server = http.createServer(app);

  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));

  try {
    const agentToken = AuthService.generateAccessToken({
      id: 'EMP-103',
      name: 'Nour Wael',
      email: 'nour.w@africatravel.com',
      role: 'AGENT',
      title: 'Ticketing Officer'
    });

    const adminToken = AuthService.generateAccessToken({
      id: 'EMP-101',
      name: 'Tarek Mansour',
      email: 'tarek@africatravel.com',
      role: 'ADMIN',
      title: 'Managing Director'
    });

    // Valid minimal JPEG buffer (starts with standard JPEG SOI marker FF D8 FF E0)
    const validJpegBuffer = Buffer.from([
      0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01,
      0x01, 0x01, 0x00, 0x60, 0x00, 0x60, 0x00, 0x00, 0xFF, 0xDB, 0x00, 0x43,
      0x00, 0x08, 0x06, 0x06, 0x07, 0x06, 0x05, 0x08, 0x07, 0x07, 0x07, 0x09,
      0x09, 0x08, 0x0A, 0x0C, 0x14, 0x0D, 0x0C, 0x0B, 0x0B, 0x0C, 0x19, 0x12,
      0xFF, 0xD9
    ]);

    const boundary = '----WebKitFormBoundaryTest123456';

    // 1. Upload valid JPEG as AGENT
    console.log('--- 1. Upload valid JPEG as AGENT ---');
    const validPayload = buildMultipartPayload(
      boundary,
      'passportDocument',
      'passport.jpg',
      'image/jpeg',
      validJpegBuffer
    );

    const uploadRes = await makeRequest(server, {
      method: 'POST',
      path: '/api/customers/CUST-1001/passport-document',
      headers: {
        'Authorization': `Bearer ${agentToken}`,
        'Content-Type': `multipart/form-data; boundary=${boundary}`
      },
      body: validPayload
    });

    assert(uploadRes.statusCode === 200, 'POST /api/customers/:id/passport-document as AGENT returns 200');
    assert(uploadRes.json?.success === true, 'Upload response returns success: true');
    assert(uploadRes.json?.data?.uploadedAt, 'Upload response contains uploadedAt timestamp');
    assert(mockCustomers[0].passportDocPath !== null, 'Customer record updated with storage path');
    assert(!uploadRes.json?.data?.path && !uploadRes.json?.data?.url, 'Upload response does NOT leak raw storage path or direct URL');

    // 2. Upload spoofed file (reported as image/jpeg but plain text content) -> 400 rejected
    console.log('\n--- 2. Magic-byte Sniffing Validation (Spoofed File) ---');
    const spoofedBuffer = Buffer.from('This is a text file claiming to be a JPEG image');
    const spoofedPayload = buildMultipartPayload(
      boundary,
      'passportDocument',
      'fake-passport.jpg',
      'image/jpeg',
      spoofedBuffer
    );

    const spoofedRes = await makeRequest(server, {
      method: 'POST',
      path: '/api/customers/CUST-1001/passport-document',
      headers: {
        'Authorization': `Bearer ${agentToken}`,
        'Content-Type': `multipart/form-data; boundary=${boundary}`
      },
      body: spoofedPayload
    });

    assert(spoofedRes.statusCode === 400, 'Spoofed file with magic-byte mismatch returns 400 Bad Request');
    assert(spoofedRes.json?.success === false, 'Spoofed file returns success: false');
    assert(spoofedRes.json?.error?.message.includes('Only JPEG, PNG, and PDF files are allowed'), 'Error message informs of allowed types');

    // 3. Upload file over 5MB -> 400 rejected
    console.log('\n--- 3. File Size Cap (Over 5MB) ---');
    const oversizedBuffer = Buffer.alloc(5 * 1024 * 1024 + 1024); // 5MB + 1KB
    const oversizedPayload = buildMultipartPayload(
      boundary,
      'passportDocument',
      'huge-passport.jpg',
      'image/jpeg',
      oversizedBuffer
    );

    const oversizedRes = await makeRequest(server, {
      method: 'POST',
      path: '/api/customers/CUST-1001/passport-document',
      headers: {
        'Authorization': `Bearer ${agentToken}`,
        'Content-Type': `multipart/form-data; boundary=${boundary}`
      },
      body: oversizedPayload
    });

    assert(oversizedRes.statusCode === 400, 'Oversized file (>5MB) returns 400 Bad Request');
    assert(oversizedRes.json?.success === false, 'Oversized upload returns success: false');

    // 4. Upload with no auth token -> 401
    console.log('\n--- 4. Unauthenticated Upload Security ---');
    const unauthedRes = await makeRequest(server, {
      method: 'POST',
      path: '/api/customers/CUST-1001/passport-document',
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`
      },
      body: validPayload
    });

    assert(unauthedRes.statusCode === 401, 'Upload without token returns 401 Unauthorized');
    assert(unauthedRes.json?.error?.code === 'UNAUTHORIZED', 'Unauthenticated request returns UNAUTHORIZED code');

    // 5. GET passport document as AGENT -> 200, returns signed URL
    console.log('\n--- 5. Get Signed URL as AGENT ---');
    const getRes = await makeRequest(server, {
      method: 'GET',
      path: '/api/customers/CUST-1001/passport-document',
      headers: {
        'Authorization': `Bearer ${agentToken}`
      }
    });

    assert(getRes.statusCode === 200, 'GET /api/customers/:id/passport-document as AGENT returns 200');
    assert(getRes.json?.success === true, 'GET response returns success: true');
    assert(typeof getRes.json?.data?.url === 'string', 'GET response returns signed url string');
    assert(getRes.json?.data?.url.includes('mock.supabase.co'), 'Signed URL points to Supabase Storage endpoint');
    assert(getRes.json?.data?.expiresAt, 'Signed URL includes expiresAt timestamp');
    assert(!getRes.json?.data?.passportDocPath, 'GET response does NOT expose raw database storage path');

    // 6. DELETE as AGENT (not ADMIN) -> 403 Forbidden
    console.log('\n--- 6. Role Enforcement: Delete by AGENT (Forbidden) ---');
    const agentDeleteRes = await makeRequest(server, {
      method: 'DELETE',
      path: '/api/customers/CUST-1001/passport-document',
      headers: {
        'Authorization': `Bearer ${agentToken}`
      }
    });

    assert(agentDeleteRes.statusCode === 403, 'DELETE /api/customers/:id/passport-document as AGENT returns 403 Forbidden');
    assert(agentDeleteRes.json?.error?.code === 'FORBIDDEN', 'Agent delete returns FORBIDDEN error code');
    assert(mockCustomers[0].passportDocPath !== null, 'Passport document path remained intact in DB');

    // 7. DELETE as ADMIN -> 204, and subsequent GET -> 404
    console.log('\n--- 7. Role Enforcement: Delete by ADMIN (Success) & Subsequent GET (404) ---');
    const adminDeleteRes = await makeRequest(server, {
      method: 'DELETE',
      path: '/api/customers/CUST-1001/passport-document',
      headers: {
        'Authorization': `Bearer ${adminToken}`
      }
    });

    assert(adminDeleteRes.statusCode === 204, 'DELETE /api/customers/:id/passport-document as ADMIN returns 204 No Content');
    assert(mockCustomers[0].passportDocPath === null, 'Passport document path cleared from customer in DB');
    assert(mockCustomers[0].passportDocUploadedAt === null, 'passportDocUploadedAt cleared in DB');

    const subsequentGetRes = await makeRequest(server, {
      method: 'GET',
      path: '/api/customers/CUST-1001/passport-document',
      headers: {
        'Authorization': `Bearer ${agentToken}`
      }
    });

    assert(subsequentGetRes.statusCode === 404, 'Subsequent GET after deletion returns 404 Not Found');

    // 8. EarlyMagicByteStorage Double-Callback Prevention Invariant Tests
    console.log('\n--- 8. EarlyMagicByteStorage Double-Callback Guard Invariant Tests ---');
    const storage = passportDocUpload.storage;

    // Test 8.1: Oversized stream drains and triggers 'end' after size error
    await new Promise((resolve) => {
      let callCount = 0;
      let receivedErr = null;
      let receivedResult = null;

      const stream = new Readable({
        read() {}
      });

      storage._handleFile({}, { stream }, (err, result) => {
        callCount++;
        receivedErr = err;
        receivedResult = result;
      });

      // Push oversized chunk > 5MB
      stream.push(Buffer.alloc(5 * 1024 * 1024 + 1024));
      // End the stream (simulates network stream finishing drain)
      stream.push(null);

      setImmediate(() => {
        assert(callCount === 1, 'Oversized file triggers callback EXACTLY ONCE (never twice)');
        assert(receivedErr?.code === 'LIMIT_FILE_SIZE', 'Callback received LIMIT_FILE_SIZE error');
        assert(receivedResult === undefined, 'Callback received no result object on error');
        resolve();
      });
    });

    // Test 8.2: Invalid magic-byte stream drains and triggers 'end' after type error
    await new Promise((resolve) => {
      let callCount = 0;
      let receivedErr = null;
      let receivedResult = null;

      const stream = new Readable({
        read() {}
      });

      storage._handleFile({}, { stream }, (err, result) => {
        callCount++;
        receivedErr = err;
        receivedResult = result;
      });

      // Push invalid header (>= 8 bytes, not PDF, JPEG, or PNG)
      stream.push(Buffer.from('NOT_A_VALID_HEADER_DATA'));
      // End the stream
      stream.push(null);

      setImmediate(() => {
        assert(callCount === 1, 'Invalid magic bytes triggers callback EXACTLY ONCE (never twice)');
        assert(receivedErr?.code === 'INVALID_FILE_TYPE', 'Callback received INVALID_FILE_TYPE error');
        assert(receivedResult === undefined, 'Callback received no result object on error');
        resolve();
      });
    });

    // Test 8.3: Valid JPEG stream triggers callback exactly once with valid buffer
    await new Promise((resolve) => {
      let callCount = 0;
      let receivedErr = null;
      let receivedResult = null;

      const stream = new Readable({
        read() {}
      });

      storage._handleFile({}, { stream }, (err, result) => {
        callCount++;
        receivedErr = err;
        receivedResult = result;
      });

      stream.push(validJpegBuffer);
      stream.push(null);

      setImmediate(() => {
        assert(callCount === 1, 'Valid upload triggers callback EXACTLY ONCE');
        assert(receivedErr === null, 'Callback received null error for valid file');
        assert(receivedResult?.buffer?.length === validJpegBuffer.length, 'Callback received complete valid buffer');
        resolve();
      });
    });

    // Test 8.4: Stream error triggers callback exactly once
    await new Promise((resolve) => {
      let callCount = 0;
      let receivedErr = null;

      const stream = new Readable({
        read() {}
      });

      storage._handleFile({}, { stream }, (err) => {
        callCount++;
        receivedErr = err;
      });

      stream.emit('error', new Error('STREAM_ABORTED'));
      stream.push(null);

      setImmediate(() => {
        assert(callCount === 1, 'Stream error triggers callback EXACTLY ONCE');
        assert(receivedErr?.message === 'STREAM_ABORTED', 'Callback received original stream error');
        resolve();
      });
    });

    console.log('\n========================================================');
    console.log(`Customer Passport Document Tests: ${passed} passed, ${failed} failed`);
    console.log('========================================================\n');
  } finally {
    server.close();
  }

  if (failures.length > 0) {
    process.exit(1);
  }
}

runPassportDocumentTests();

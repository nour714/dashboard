/**
 * AfricaTravel — Visas Feature Verification Tests
 *
 * Verifies:
 * 1. Schema validation (enums, required fields, price)
 * 2. ADMIN and AGENT can create visas
 * 3. Visibility scope: ADMIN sees all visas
 * 4. Visibility scope: AGENT sees ONLY their own visas
 * 5. Type and payment status filters
 * 6. Search filter (clientName and country)
 * 7. RBAC: AGENT cannot delete (403), ADMIN delete soft-deletes
 * 8. Soft-deleted visas excluded from getVisas
 * 9. Controller sanitizes costPrice for non-admin
 */

import { VisaService } from '../../backend/src/services/visa.service.js';
import { VisaController } from '../../backend/src/controllers/visa.controller.js';
import { setPrismaClient } from '../../backend/src/config/database.js';
import {
  createVisaSchema,
  queryVisasSchema,
  updateVisaSchema
} from '../../backend/src/schemas/visa.schema.js';

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

async function runVisaTests() {
  console.log('\n🛂 ========================================================');
  console.log('   AfricaTravel Visas Verification Tests');
  console.log('========================================================\n');

  // 1. Schema Validation Tests
  console.log('📋 Test Suite 1: Validation Schemas');

  const validData = {
    clientName: 'Ahmed Ali',
    phone: '+201234567890',
    visaType: 'TOURIST',
    country: 'Saudi Arabia',
    submissionDate: '2026-09-21T10:00:00Z',
    price: 1500,
    costPrice: 1000,
    currency: 'EGP',
    paymentStatus: 'UNPAID',
    notes: 'Urgent processing'
  };

  const parseResult = createVisaSchema.safeParse(validData);
  assert(parseResult.success, 'createVisaSchema accepts valid payload');

  const invalidTypeResult = createVisaSchema.safeParse({ ...validData, visaType: 'INVALID_TYPE' });
  assert(!invalidTypeResult.success, 'createVisaSchema rejects invalid visaType');

  const missingNameResult = createVisaSchema.safeParse({ ...validData, clientName: '' });
  assert(!missingNameResult.success, 'createVisaSchema rejects empty clientName');

  const negativePriceResult = createVisaSchema.safeParse({ ...validData, price: -100 });
  assert(!negativePriceResult.success, 'createVisaSchema rejects negative price');

  const updateResult = updateVisaSchema.safeParse({ price: 2000 });
  assert(updateResult.success, 'updateVisaSchema accepts partial updates');

  const emptyUpdateResult = updateVisaSchema.safeParse({});
  assert(!emptyUpdateResult.success, 'updateVisaSchema rejects empty update');

  // 2. Service Logic with Mock Prisma
  console.log('\n⚙️ Test Suite 2: Service CRUD & Role Scoping');

  const mockVisas = new Map();
  const mockAuditLogs = [];
  let visaIdCounter = 1;

  const adminUser = {
    id: 'EMP-ADMIN001',
    name: 'Lead Admin',
    email: 'admin@africatravel.com',
    role: 'ADMIN',
    title: 'Operations Director'
  };

  const agent1 = {
    id: 'EMP-AGENT001',
    name: 'Agent Sarah',
    email: 'sarah@africatravel.com',
    role: 'AGENT',
    title: 'Travel Consultant'
  };

  const agent2 = {
    id: 'EMP-AGENT002',
    name: 'Agent Omar',
    email: 'omar@africatravel.com',
    role: 'AGENT',
    title: 'Booking Specialist'
  };

  const mockPrisma = {
    $transaction: async (fn) => fn(mockPrisma),
    visa: {
      create: async ({ data }) => {
        const id = `visa-${visaIdCounter++}`;
        const record = {
          id,
          ...data,
          deletedAt: null,
          createdAt: new Date(),
          updatedAt: new Date()
        };
        mockVisas.set(id, record);
        return { ...record };
      },
      findFirst: async ({ where }) => {
        for (const record of mockVisas.values()) {
          if (where.id && record.id !== where.id) continue;
          if (where.deletedAt === null && record.deletedAt !== null) continue;
          return { ...record };
        }
        return null;
      },
      findMany: async ({ where = {}, orderBy, skip = 0, take = 25 }) => {
        let list = Array.from(mockVisas.values()).filter(record => {
          if (where.deletedAt === null && record.deletedAt !== null) return false;
          if (where.createdById && record.createdById !== where.createdById) return false;
          if (where.visaType && record.visaType !== where.visaType) return false;
          if (where.paymentStatus && record.paymentStatus !== where.paymentStatus) return false;
          if (where.OR) {
            const matches = where.OR.some(cond => {
              if (cond.clientName?.contains) {
                return record.clientName.toLowerCase().includes(cond.clientName.contains.toLowerCase());
              }
              if (cond.country?.contains) {
                return record.country.toLowerCase().includes(cond.country.contains.toLowerCase());
              }
              return false;
            });
            if (!matches) return false;
          }
          return true;
        });
        return list.slice(skip, skip + take);
      },
      count: async ({ where = {} }) => {
        const list = await mockPrisma.visa.findMany({ where, skip: 0, take: 9999 });
        return list.length;
      },
      update: async ({ where, data }) => {
        const existing = mockVisas.get(where.id);
        if (!existing) throw new Error('Not found');
        const updated = { ...existing, ...data, updatedAt: new Date() };
        mockVisas.set(where.id, updated);
        return { ...updated };
      }
    },
    auditLog: {
      create: async ({ data }) => {
        mockAuditLogs.push(data);
        return data;
      }
    }
  };

  setPrismaClient(mockPrisma);

  // Test creation by Agent 1
  const visa1 = await VisaService.createVisa({
    clientName: 'Mahmoud Hassan',
    phone: '01011112222',
    visaType: 'TOURIST',
    country: 'UAE',
    submissionDate: new Date(),
    price: 3500,
    costPrice: 2800,
    currency: 'EGP',
    paymentStatus: 'PAID'
  }, agent1);

  assert(visa1 && visa1.id, 'Agent 1 creates visa successfully');
  assert(visa1.createdById === agent1.id, 'Visa createdById is correctly attributed to Agent 1');

  // Test creation by Agent 2
  const visa2 = await VisaService.createVisa({
    clientName: 'Fatma Youssef',
    phone: '01033334444',
    visaType: 'WORK',
    country: 'Saudi Arabia',
    submissionDate: new Date(),
    price: 8000,
    costPrice: 6500,
    currency: 'EGP',
    paymentStatus: 'UNPAID'
  }, agent2);

  assert(visa2 && visa2.id, 'Agent 2 creates visa successfully');

  // Visibility tests
  const agent1Visas = await VisaService.getVisas({}, agent1);
  assert(agent1Visas.visas.length === 1 && agent1Visas.visas[0].id === visa1.id, 'Agent 1 sees ONLY their own visas');

  const agent2Visas = await VisaService.getVisas({}, agent2);
  assert(agent2Visas.visas.length === 1 && agent2Visas.visas[0].id === visa2.id, 'Agent 2 sees ONLY their own visas');

  const adminVisas = await VisaService.getVisas({}, adminUser);
  assert(adminVisas.visas.length === 2, 'Admin sees all visas across all agents');

  // Filter tests
  const workVisas = await VisaService.getVisas({ visaType: 'WORK' }, adminUser);
  assert(workVisas.visas.length === 1 && workVisas.visas[0].visaType === 'WORK', 'Filter by visaType works');

  const paidVisas = await VisaService.getVisas({ paymentStatus: 'PAID' }, adminUser);
  assert(paidVisas.visas.length === 1 && paidVisas.visas[0].paymentStatus === 'PAID', 'Filter by paymentStatus works');

  // Search test
  const searchResult = await VisaService.getVisas({ search: 'Saudi' }, adminUser);
  assert(searchResult.visas.length === 1 && searchResult.visas[0].country === 'Saudi Arabia', 'Search by country works');

  // Update tests
  const updatedVisa = await VisaService.updateVisa(visa1.id, { paymentStatus: 'PAID', notes: 'Done' }, agent1);
  assert(updatedVisa.paymentStatus === 'PAID', 'Agent can update their own visa');

  let agentForbidden = false;
  try {
    await VisaService.updateVisa(visa2.id, { notes: 'Hacked' }, agent1);
  } catch (err) {
    if (err.name === 'ForbiddenError' || err.statusCode === 403) agentForbidden = true;
  }
  assert(agentForbidden, 'Agent CANNOT update another agent visa (ForbiddenError 403)');

  // Delete tests
  let deleteForbidden = false;
  try {
    await VisaService.deleteVisa(visa1.id, agent1);
  } catch (err) {
    if (err.name === 'ForbiddenError' || err.statusCode === 403) deleteForbidden = true;
  }
  assert(deleteForbidden, 'Agent CANNOT delete visa records (ForbiddenError 403)');

  const deleteResult = await VisaService.deleteVisa(visa1.id, adminUser);
  assert(deleteResult.deletedAt !== null, 'Admin can soft-delete visa record');

  const afterDelete = await VisaService.getVisas({}, adminUser);
  assert(afterDelete.visas.length === 1 && afterDelete.visas[0].id === visa2.id, 'Soft-deleted visas are excluded from getVisas');

  // 3. Controller Sanitization Tests
  console.log('\n🛡️ Test Suite 3: Controller Role Sanitization');

  // Mock res object
  let capturedResponse = {};
  const mockRes = {
    status: (code) => ({
      json: (data) => {
        capturedResponse = { status: code, body: data };
        return capturedResponse;
      }
    })
  };

  // Admin gets costPrice
  await VisaController.getVisas({ query: {}, user: adminUser }, mockRes, (err) => { throw err; });
  assert(capturedResponse.body.data[0].costPrice !== undefined, 'Admin gets costPrice in visa response');

  // Agent DOES NOT get costPrice
  await VisaController.getVisas({ query: {}, user: agent2 }, mockRes, (err) => { throw err; });
  assert(capturedResponse.body.data[0].costPrice === undefined, 'Agent response hides costPrice (role sanitization)');

  console.log('\n========================================================');
  console.log(`Passed: ${passed} | Failed: ${failed}`);
  console.log('========================================================\n');

  if (failed > 0) {
    console.error('Failed checks:', failures);
    process.exit(1);
  }
}

runVisaTests().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});

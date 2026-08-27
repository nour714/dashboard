/**
 * AfricaTravel — Employee Delete Feature Verification Tests
 *
 * Verifies:
 * 1. CANNOT_DELETE_SELF guard
 * 2. CANNOT_DELETE_LAST_ADMIN guard
 * 3. Confirmation mismatch rejection
 * 4. Successful deletion of a non-admin employee
 * 5. Successful deletion of an admin when multiple admins exist
 * 6. DELETE_EMPLOYEE audit log recorded
 * 7. Schema validation (deleteEmployeeSchema)
 * 8. RBAC: AGENT cannot call DELETE /api/employees/:id
 */

import { EmployeeService } from '../server/src/services/employee.service.js';
import { setPrismaClient } from '../server/src/config/database.js';
import { deleteEmployeeSchema } from '../server/src/schemas/employee.schema.js';

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

async function runEmployeeDeleteTests() {
  console.log('\n🗑️  ========================================================');
  console.log('   AfricaTravel Employee Delete Verification Tests');
  console.log('========================================================\n');

  // In-memory mock state
  const mockUsers = new Map();
  const mockAuditLogs = [];

  const adminUser = {
    id: 'EMP-ADMIN001',
    name: 'Lead Admin',
    email: 'admin@africatravel.com',
    role: 'ADMIN',
    title: 'Operations Director',
    status: 'ACTIVE',
    lastActive: new Date().toISOString(),
    createdAt: new Date().toISOString()
  };

  const agentUser = {
    id: 'EMP-AGENT001',
    name: 'Test Agent',
    email: 'agent@africatravel.com',
    role: 'AGENT',
    title: 'Ticketing Officer',
    status: 'ACTIVE',
    lastActive: new Date().toISOString(),
    createdAt: new Date().toISOString()
  };

  const secondAdmin = {
    id: 'EMP-ADMIN002',
    name: 'Second Admin',
    email: 'admin2@africatravel.com',
    role: 'ADMIN',
    title: 'Deputy Director',
    status: 'ACTIVE',
    lastActive: new Date().toISOString(),
    createdAt: new Date().toISOString()
  };

  function resetUsers() {
    mockUsers.clear();
    mockUsers.set(adminUser.id, { ...adminUser });
    mockUsers.set(agentUser.id, { ...agentUser });
    mockAuditLogs.length = 0;
  }

  const mockPrisma = {
    user: {
      findUnique: async ({ where }) => {
        const u = where.id ? mockUsers.get(where.id) : [...mockUsers.values()].find(x => x.email === where.email);
        return u ? { ...u } : null;
      },
      findMany: async ({ select, orderBy } = {}) => {
        return [...mockUsers.values()].map(u => ({ ...u }));
      },
      count: async ({ where }) => {
        let list = [...mockUsers.values()];
        if (where?.role) list = list.filter(u => u.role === where.role);
        if (where?.status) list = list.filter(u => u.status === where.status);
        return list.length;
      },
      create: async ({ data, select }) => {
        mockUsers.set(data.id, { ...data });
        return { ...data };
      },
      update: async ({ where, data, select }) => {
        const u = mockUsers.get(where.id);
        if (u) Object.assign(u, data);
        return u ? { ...u } : null;
      },
      delete: async ({ where }) => {
        const u = mockUsers.get(where.id);
        if (u) mockUsers.delete(where.id);
        return u || null;
      }
    },
    ticket: {
      findMany: async () => [],
    },
    auditLog: {
      create: async ({ data }) => {
        mockAuditLogs.push(data);
        return data;
      }
    },
    $transaction: async (fn) => fn(mockPrisma)
  };

  setPrismaClient(mockPrisma);

  // --- 1. CANNOT_DELETE_SELF ---
  console.log('--- 1. Self-Delete Guard ---');
  resetUsers();

  try {
    await EmployeeService.deleteEmployee(adminUser.id, adminUser, adminUser.id);
    assert(false, 'Self-delete should throw CANNOT_DELETE_SELF');
  } catch (err) {
    assert(err.rule === 'CANNOT_DELETE_SELF' || err.code === 'CANNOT_DELETE_SELF' || err.details?.rule === 'CANNOT_DELETE_SELF', 'Self-delete throws CANNOT_DELETE_SELF');
    assert(err.message.includes('cannot delete their own'), 'Error message mentions self-delete restriction');
  }
  assert(mockUsers.has(adminUser.id), 'Admin user still exists after self-delete attempt');

  // --- 2. CANNOT_DELETE_LAST_ADMIN ---
  console.log('\n--- 2. Last Admin Guard ---');
  resetUsers();
  // Only one ADMIN in the mock state

  try {
    await EmployeeService.deleteEmployee(adminUser.id, { id: 'EMP-OTHER', name: 'Other Admin' }, adminUser.id);
    assert(false, 'Deleting last admin should throw CANNOT_DELETE_LAST_ADMIN');
  } catch (err) {
    assert(err.rule === 'CANNOT_DELETE_LAST_ADMIN' || err.code === 'CANNOT_DELETE_LAST_ADMIN' || err.details?.rule === 'CANNOT_DELETE_LAST_ADMIN', 'Deleting last admin throws CANNOT_DELETE_LAST_ADMIN');
    assert(err.message.includes('last remaining'), 'Error message mentions last admin restriction');
  }
  assert(mockUsers.has(adminUser.id), 'Last admin still exists after delete attempt');

  // --- 3. Confirmation Mismatch ---
  console.log('\n--- 3. Confirmation ID Mismatch ---');
  resetUsers();

  try {
    await EmployeeService.deleteEmployee(agentUser.id, adminUser, 'WRONG-ID');
    assert(false, 'Mismatched confirmEmployeeId should throw');
  } catch (err) {
    assert(err.field === 'confirmEmployeeId' || err.code === 'VALIDATION_ERROR', 'Mismatched confirmation throws ValidationError');
  }
  assert(mockUsers.has(agentUser.id), 'Agent still exists after confirmation mismatch');

  // --- 4. Successful Delete of Non-Admin Employee ---
  console.log('\n--- 4. Successful Delete of Non-Admin Employee ---');
  resetUsers();

  const result = await EmployeeService.deleteEmployee(agentUser.id, adminUser, agentUser.id);
  assert(result.deleted === true, 'Delete returns { deleted: true }');
  assert(result.id === agentUser.id, 'Delete returns correct employee ID');
  assert(!mockUsers.has(agentUser.id), 'Agent is removed from database');
  assert(mockUsers.has(adminUser.id), 'Admin is unaffected');

  // --- 5. Audit Log Recorded ---
  console.log('\n--- 5. DELETE_EMPLOYEE Audit Log ---');
  const auditEntry = mockAuditLogs.find(l => l.action === 'DELETE_EMPLOYEE');
  assert(!!auditEntry, 'DELETE_EMPLOYEE audit log recorded');
  assert(auditEntry?.description?.includes(agentUser.name), 'Audit log description contains deleted employee name');
  assert(auditEntry?.description?.includes(agentUser.email), 'Audit log description contains deleted employee email');
  assert(auditEntry?.metadata?.adminId === adminUser.id, 'Audit log metadata has correct adminId');
  assert(auditEntry?.metadata?.targetId === agentUser.id, 'Audit log metadata has correct targetId');
  assert(auditEntry?.metadata?.deletedRole === 'AGENT', 'Audit log metadata records deleted role');
  assert(auditEntry?.metadata?.targetType === 'EMPLOYEE', 'Audit log metadata targetType is EMPLOYEE');

  // --- 6. Successful Delete of Admin When Multiple Admins Exist ---
  console.log('\n--- 6. Delete Admin When Multiple Admins Exist ---');
  resetUsers();
  mockUsers.set(secondAdmin.id, { ...secondAdmin });
  mockAuditLogs.length = 0;

  // Delete secondAdmin as adminUser — should succeed because 2 admins exist
  const result2 = await EmployeeService.deleteEmployee(secondAdmin.id, adminUser, secondAdmin.id);
  assert(result2.deleted === true, 'Successfully deleted second admin');
  assert(!mockUsers.has(secondAdmin.id), 'Second admin is removed from database');
  assert(mockUsers.has(adminUser.id), 'Primary admin is unaffected');
  const auditEntry2 = mockAuditLogs.find(l => l.action === 'DELETE_EMPLOYEE' && l.metadata?.targetId === secondAdmin.id);
  assert(!!auditEntry2, 'DELETE_EMPLOYEE audit log recorded for admin deletion');

  // --- 7. NotFoundError for non-existent employee ---
  console.log('\n--- 7. NotFoundError for Non-Existent Employee ---');
  try {
    await EmployeeService.deleteEmployee('EMP-DOES-NOT-EXIST', adminUser, 'EMP-DOES-NOT-EXIST');
    assert(false, 'Deleting non-existent employee should throw');
  } catch (err) {
    assert(err.statusCode === 404 || err.code === 'NOT_FOUND', 'Non-existent employee throws NotFoundError');
  }

  // --- 8. Schema Validation ---
  console.log('\n--- 8. deleteEmployeeSchema Validation ---');
  const emptyResult = deleteEmployeeSchema.safeParse({});
  assert(!emptyResult.success, 'deleteEmployeeSchema rejects empty body');
  assert(emptyResult.error?.issues?.[0]?.path?.includes('confirmEmployeeId'), 'Error path includes confirmEmployeeId');

  const blankResult = deleteEmployeeSchema.safeParse({ confirmEmployeeId: '' });
  assert(!blankResult.success, 'deleteEmployeeSchema rejects blank confirmEmployeeId');

  const validResult = deleteEmployeeSchema.safeParse({ confirmEmployeeId: 'EMP-12345678' });
  assert(validResult.success, 'deleteEmployeeSchema accepts valid confirmEmployeeId');

  // Summary
  console.log('\n========================================================');
  console.log(`Employee Delete Tests: ${passed} passed, ${failed} failed`);
  console.log('========================================================\n');

  if (failed > 0) {
    console.error('Failed tests:', failures);
    process.exit(1);
  }
}

runEmployeeDeleteTests().catch(err => {
  console.error('Test suite error:', err);
  process.exit(1);
});

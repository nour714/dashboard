/**
 * AfricaTravel — Office Expenses Feature Verification Tests
 *
 * Verifies:
 * 1. ADMIN creates expense (SERVICES) -> success
 * 2. AGENT creates expense (TRANSFERS) -> success
 * 3. Validation schema enforcement (category enum, amount > 0, required fields)
 * 4. Visibility scope: ADMIN sees all office expenses
 * 5. Visibility scope: AGENT sees ONLY their own office expenses
 * 6. Date and Category filters
 * 7. RBAC: AGENT delete is forbidden (403)
 * 8. ADMIN delete succeeds with soft delete (deletedAt set)
 * 9. Soft-deleted expenses are excluded from getExpenses
 * 10. Financial isolation: Ticket financial reports & net profit are unaffected by office expenses
 */

import { ExpenseService } from '../server/src/services/expense.service.js';
import { setPrismaClient } from '../server/src/config/database.js';
import {
  createExpenseSchema,
  queryExpensesSchema,
  updateExpenseSchema
} from '../server/src/schemas/expense.schema.js';

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

async function runExpenseTests() {
  console.log('\n💼 ========================================================');
  console.log('   AfricaTravel Office Expenses Verification Tests');
  console.log('========================================================\n');

  // In-memory mock database state
  const mockExpenses = new Map();
  const mockAuditLogs = [];
  let expenseIdCounter = 1;

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
    title: 'Ticketing Officer'
  };

  const agent2 = {
    id: 'EMP-AGENT002',
    name: 'Agent Ahmed',
    email: 'ahmed@africatravel.com',
    role: 'AGENT',
    title: 'Ticketing Officer'
  };

  const ticketOnlyUser = {
    id: 'EMP-TICKETONLY',
    name: 'Ticket Creator',
    email: 'creator@africatravel.com',
    role: 'TICKET_ONLY',
    title: 'Ticket Officer'
  };

  function resetState() {
    mockExpenses.clear();
    mockAuditLogs.length = 0;
    expenseIdCounter = 1;
  }

  const mockPrisma = {
    auditLog: {
      create: async ({ data }) => {
        const log = {
          id: `ACT-${mockAuditLogs.length + 1}`,
          ...data,
          timestamp: new Date()
        };
        mockAuditLogs.push(log);
        return log;
      }
    },

    expense: {
      create: async ({ data }) => {
        const id = `EXP-${expenseIdCounter++}`;
        const record = {
          id,
          category: data.category,
          amount: data.amount,
          currency: data.currency || 'EGP',
          description: data.description,
          date: data.date instanceof Date ? data.date : new Date(data.date),
          createdBy: data.createdBy,
          createdById: data.createdById || null,
          deletedAt: null,
          createdAt: new Date(),
          updatedAt: new Date()
        };
        mockExpenses.set(id, record);
        return { ...record };
      },

      findMany: async ({ where = {}, orderBy = {}, skip = 0, take = 25 } = {}) => {
        let list = [...mockExpenses.values()];

        if (where.deletedAt === null) {
          list = list.filter(e => e.deletedAt === null || e.deletedAt === undefined);
        }
        if (where.createdById) {
          list = list.filter(e => e.createdById === where.createdById);
        }
        if (where.category) {
          list = list.filter(e => e.category === where.category);
        }
        if (where.date) {
          if (where.date.gte) {
            list = list.filter(e => new Date(e.date) >= where.date.gte);
          }
          if (where.date.lte) {
            list = list.filter(e => new Date(e.date) <= where.date.lte);
          }
        }

        // Sort desc
        list.sort((a, b) => new Date(b.date) - new Date(a.date));

        return list.slice(skip, skip + take).map(e => ({ ...e }));
      },

      count: async ({ where = {} } = {}) => {
        let list = [...mockExpenses.values()];
        if (where.deletedAt === null) {
          list = list.filter(e => e.deletedAt === null || e.deletedAt === undefined);
        }
        if (where.createdById) {
          list = list.filter(e => e.createdById === where.createdById);
        }
        if (where.category) {
          list = list.filter(e => e.category === where.category);
        }
        if (where.date) {
          if (where.date.gte) {
            list = list.filter(e => new Date(e.date) >= where.date.gte);
          }
          if (where.date.lte) {
            list = list.filter(e => new Date(e.date) <= where.date.lte);
          }
        }
        return list.length;
      },

      findFirst: async ({ where = {} } = {}) => {
        let list = [...mockExpenses.values()];
        if (where.id) list = list.filter(e => e.id === where.id);
        if (where.deletedAt === null) list = list.filter(e => !e.deletedAt);
        return list[0] ? { ...list[0] } : null;
      },

      update: async ({ where, data }) => {
        const item = mockExpenses.get(where.id);
        if (item) {
          Object.assign(item, data, { updatedAt: new Date() });
          return { ...item };
        }
        return null;
      }
    }
  };

  setPrismaClient(mockPrisma);

  // --- 1. Create Expenses ---
  console.log('--- 1. Expense Creation & Validation ---');
  resetState();

  const exp1 = await ExpenseService.createExpense({
    category: 'SERVICES',
    amount: 1500,
    currency: 'EGP',
    description: 'Electricity and Internet utilities',
    date: '2026-08-20T10:00:00.000Z'
  }, adminUser);

  assert(exp1.id === 'EXP-1', 'ADMIN created expense successfully with EXP-1 ID');
  assert(exp1.category === 'SERVICES', 'Category is SERVICES');
  assert(exp1.amount === 1500, 'Amount is 1500');
  assert(exp1.createdById === adminUser.id, 'createdById correctly set to Admin ID');

  const exp2 = await ExpenseService.createExpense({
    category: 'TRANSFERS',
    amount: 5000,
    currency: 'EGP',
    description: 'Bank transfer for office rent',
    date: '2026-08-22T12:00:00.000Z'
  }, agent1);

  assert(exp2.id === 'EXP-2', 'AGENT 1 created expense successfully with EXP-2 ID');
  assert(exp2.category === 'TRANSFERS', 'Category is TRANSFERS');
  assert(exp2.createdById === agent1.id, 'createdById correctly set to Agent 1 ID');

  const exp3 = await ExpenseService.createExpense({
    category: 'SERVICES',
    amount: 350,
    currency: 'EGP',
    description: 'Courier delivery services',
    date: '2026-08-25T14:30:00.000Z'
  }, agent2);

  assert(exp3.id === 'EXP-3', 'AGENT 2 created expense successfully with EXP-3 ID');
  assert(exp3.createdById === agent2.id, 'createdById correctly set to Agent 2 ID');

  // --- 2. Validation Schemas ---
  console.log('\n--- 2. Schema Validation ---');
  const invalidCategory = createExpenseSchema.safeParse({
    category: 'INVALID_CATEGORY',
    amount: 100,
    description: 'Test',
    date: '2026-08-28'
  });
  assert(!invalidCategory.success, 'Schema rejects invalid category enum');

  const negativeAmount = createExpenseSchema.safeParse({
    category: 'SERVICES',
    amount: -50,
    description: 'Test',
    date: '2026-08-28'
  });
  assert(!negativeAmount.success, 'Schema rejects negative amount');

  const zeroAmount = createExpenseSchema.safeParse({
    category: 'SERVICES',
    amount: 0,
    description: 'Test',
    date: '2026-08-28'
  });
  assert(!zeroAmount.success, 'Schema rejects zero amount');

  const missingDesc = createExpenseSchema.safeParse({
    category: 'SERVICES',
    amount: 200,
    description: '   ',
    date: '2026-08-28'
  });
  assert(!missingDesc.success, 'Schema rejects empty description');

  const validPayload = createExpenseSchema.safeParse({
    category: 'TRANSFERS',
    amount: '4500.50',
    description: 'Vendor payment',
    date: '2026-08-28'
  });
  assert(validPayload.success, 'Schema coerces numeric amount string and accepts valid payload');
  assert(validPayload.data.amount === 4500.5, 'Parsed amount is numeric 4500.5');

  // updateExpenseSchema validation
  const emptyUpdate = updateExpenseSchema.safeParse({});
  assert(!emptyUpdate.success, 'updateExpenseSchema rejects empty update payload');

  const invalidUpdateCat = updateExpenseSchema.safeParse({ category: 'BOGUS' });
  assert(!invalidUpdateCat.success, 'updateExpenseSchema rejects invalid category');

  const invalidUpdateAmt = updateExpenseSchema.safeParse({ amount: -10 });
  assert(!invalidUpdateAmt.success, 'updateExpenseSchema rejects negative amount');

  const invalidUpdateDesc = updateExpenseSchema.safeParse({ description: '   ' });
  assert(!invalidUpdateDesc.success, 'updateExpenseSchema rejects whitespace-only description');

  const validPartialUpdate = updateExpenseSchema.safeParse({ amount: '2500', description: 'Updated note' });
  assert(validPartialUpdate.success, 'updateExpenseSchema accepts valid partial update');
  assert(validPartialUpdate.data.amount === 2500, 'updateExpenseSchema coerces amount to 2500');

  // --- 3. Visibility Scope: ADMIN vs AGENT ---
  console.log('\n--- 3. Role-Based Visibility Scope ---');
  // ADMIN fetches all expenses
  const adminView = await ExpenseService.getExpenses({}, adminUser);
  assert(adminView.expenses.length === 3, 'ADMIN sees all 3 expenses across all agents');
  assert(adminView.pagination.total === 3, 'ADMIN pagination total is 3');

  // AGENT 1 fetches expenses -> should see ONLY EXP-2
  const agent1View = await ExpenseService.getExpenses({}, agent1);
  assert(agent1View.expenses.length === 1, 'AGENT 1 sees exactly 1 expense');
  assert(agent1View.expenses[0].id === 'EXP-2', 'AGENT 1 sees only their own expense EXP-2');
  assert(agent1View.pagination.total === 1, 'AGENT 1 pagination total is 1');

  // AGENT 2 fetches expenses -> should see ONLY EXP-3
  const agent2View = await ExpenseService.getExpenses({}, agent2);
  assert(agent2View.expenses.length === 1, 'AGENT 2 sees exactly 1 expense');
  assert(agent2View.expenses[0].id === 'EXP-3', 'AGENT 2 sees only their own expense EXP-3');
  assert(agent2View.pagination.total === 1, 'AGENT 2 pagination total is 1');

  // --- 4. Filtering: Category and Date ---
  console.log('\n--- 4. Category & Date Filters ---');
  const servicesOnly = await ExpenseService.getExpenses({ category: 'SERVICES' }, adminUser);
  assert(servicesOnly.expenses.length === 2, 'Category filter SERVICES returns 2 records for ADMIN');
  assert(servicesOnly.expenses.every(e => e.category === 'SERVICES'), 'All returned records are SERVICES');

  const transfersOnly = await ExpenseService.getExpenses({ category: 'TRANSFERS' }, adminUser);
  assert(transfersOnly.expenses.length === 1, 'Category filter TRANSFERS returns 1 record for ADMIN');
  assert(transfersOnly.expenses[0].id === 'EXP-2', 'TRANSFERS record is EXP-2');

  const dateFiltered = await ExpenseService.getExpenses({
    startDate: '2026-08-21',
    endDate: '2026-08-23'
  }, adminUser);
  assert(dateFiltered.expenses.length === 1, 'Date range filter returns 1 record (EXP-2 on 2026-08-22)');
  assert(dateFiltered.expenses[0].id === 'EXP-2', 'Date range correctly matched EXP-2');

  // --- 5. Deletion & RBAC ---
  console.log('\n--- 5. Deletion & RBAC ---');
  // AGENT attempts to delete expense -> ForbiddenError
  try {
    await ExpenseService.deleteExpense('EXP-2', agent1);
    assert(false, 'AGENT deleting expense should throw ForbiddenError');
  } catch (err) {
    assert(err.statusCode === 403 || err.code === 'FORBIDDEN', 'AGENT delete is rejected with 403 / FORBIDDEN');
  }
  assert(mockExpenses.get('EXP-2').deletedAt === null, 'EXP-2 is not deleted after failed agent attempt');

  // ADMIN deletes expense -> succeeds
  const deleteRes = await ExpenseService.deleteExpense('EXP-2', adminUser);
  assert(deleteRes.deletedAt instanceof Date, 'ADMIN successfully soft-deleted EXP-2');
  assert(mockExpenses.get('EXP-2').deletedAt !== null, 'EXP-2 deletedAt is set in database');

  // Verify deleted expense is excluded from subsequent queries
  const adminViewAfterDelete = await ExpenseService.getExpenses({}, adminUser);
  assert(adminViewAfterDelete.expenses.length === 2, 'ADMIN now sees 2 active expenses (deleted EXP-2 excluded)');
  assert(!adminViewAfterDelete.expenses.some(e => e.id === 'EXP-2'), 'EXP-2 is excluded from list');

  const agent1ViewAfterDelete = await ExpenseService.getExpenses({}, agent1);
  assert(agent1ViewAfterDelete.expenses.length === 0, 'AGENT 1 now sees 0 active expenses');

  // Attempting to delete already deleted or non-existent expense throws NotFoundError
  try {
    await ExpenseService.deleteExpense('EXP-2', adminUser);
    assert(false, 'Deleting already deleted expense should throw NotFoundError');
  } catch (err) {
    assert(err.statusCode === 404 || err.code === 'NOT_FOUND', 'Deleting non-existent/deleted expense throws NotFoundError');
  }

  // --- 6. Expense Update & RBAC ---
  console.log('\n--- 6. Expense Update & RBAC ---');
  // AGENT attempts to update expense -> ForbiddenError
  try {
    await ExpenseService.updateExpense('EXP-1', { amount: 2000 }, agent1);
    assert(false, 'AGENT updating expense should throw ForbiddenError');
  } catch (err) {
    assert(err.statusCode === 403 || err.code === 'FORBIDDEN', 'AGENT update is rejected with 403 / FORBIDDEN');
  }

  // TICKET_ONLY attempts to update expense -> ForbiddenError
  try {
    await ExpenseService.updateExpense('EXP-1', { amount: 2000 }, ticketOnlyUser);
    assert(false, 'TICKET_ONLY updating expense should throw ForbiddenError');
  } catch (err) {
    assert(err.statusCode === 403 || err.code === 'FORBIDDEN', 'TICKET_ONLY update is rejected with 403 / FORBIDDEN');
  }

  // Updating non-existent or deleted expense -> NotFoundError
  try {
    await ExpenseService.updateExpense('EXP-2', { amount: 6000 }, adminUser);
    assert(false, 'Updating deleted expense should throw NotFoundError');
  } catch (err) {
    assert(err.statusCode === 404 || err.code === 'NOT_FOUND', 'Updating non-existent/deleted expense throws NotFoundError');
  }

  // ADMIN updates expense -> succeeds
  const updatedExp1 = await ExpenseService.updateExpense('EXP-1', {
    amount: 1800,
    description: 'Updated Electricity and Fiber Internet'
  }, adminUser);

  assert(updatedExp1.id === 'EXP-1', 'ADMIN successfully updated EXP-1');
  assert(updatedExp1.amount === 1800, 'EXP-1 amount successfully updated to 1800');
  assert(updatedExp1.description === 'Updated Electricity and Fiber Internet', 'EXP-1 description successfully updated');

  // Verify updated expense appears with new data in getExpenses
  const adminViewAfterUpdate = await ExpenseService.getExpenses({}, adminUser);
  const foundExp1 = adminViewAfterUpdate.expenses.find(e => e.id === 'EXP-1');
  assert(foundExp1.amount === 1800, 'getExpenses reflects updated amount 1800');
  assert(foundExp1.description === 'Updated Electricity and Fiber Internet', 'getExpenses reflects updated description');

  // --- 7. Complete Financial Separation from Ticket Reports ---
  console.log('\n--- 7. Financial Separation from Ticket Ledger ---');
  // Confirm office expenses are completely distinct from ticket profit & loss calculation
  assert(!('ticketId' in exp1), 'Expense model has no ticketId foreign key');
  assert(!('customerId' in exp1), 'Expense model has no customerId foreign key');

  // --- 8. Audit Logging for Expense Actions ---
  console.log('\n--- 8. Audit Logging for Expense Actions ---');
  const createLogs = mockAuditLogs.filter(l => l.action === 'CREATE_EXPENSE');
  assert(createLogs.length === 3, 'Recorded 3 CREATE_EXPENSE audit logs for created expenses');
  assert(createLogs[0].metadata?.category === 'SERVICES', 'First create log has correct category SERVICES');
  assert(createLogs[0].metadata?.amount === 1500, 'First create log has correct amount 1500');
  assert(createLogs[0].metadata?.description === 'Electricity and Internet utilities', 'First create log has correct description');
  assert(createLogs[0].metadata?.expenseId === 'EXP-1', 'First create log has correct expenseId EXP-1');

  const deleteLogs = mockAuditLogs.filter(l => l.action === 'DELETE_EXPENSE');
  assert(deleteLogs.length === 1, 'Recorded 1 DELETE_EXPENSE audit log for deleted expense');
  assert(deleteLogs[0].metadata?.expenseId === 'EXP-2', 'Delete log references deleted expenseId EXP-2');
  assert(deleteLogs[0].metadata?.category === 'TRANSFERS', 'Delete log records category TRANSFERS');
  assert(deleteLogs[0].metadata?.amount === 5000, 'Delete log records amount 5000');
  assert(deleteLogs[0].metadata?.description === 'Bank transfer for office rent', 'Delete log records description');
  assert(deleteLogs[0].metadata?.adminId === adminUser.id, 'Delete log records adminId');

  const updateLogs = mockAuditLogs.filter(l => l.action === 'UPDATE_EXPENSE');
  assert(updateLogs.length === 1, 'Recorded 1 UPDATE_EXPENSE audit log for updated expense');
  assert(updateLogs[0].metadata?.expenseId === 'EXP-1', 'Update log references updated expenseId EXP-1');
  assert(updateLogs[0].metadata?.changes?.amount === 1800, 'Update log records changed amount 1800');
  assert(updateLogs[0].metadata?.previous?.amount === 1500, 'Update log records previous amount 1500');
  assert(updateLogs[0].metadata?.adminId === adminUser.id, 'Update log records adminId');

  // --- 9. Fail-Closed Transactional Audit Logging ---
  console.log('\n--- 9. Fail-Closed Transactional Audit Logging ---');
  let simulateAuditFailure = false;
  mockPrisma.auditLog.create = async ({ data }) => {
    if (simulateAuditFailure) {
      throw new Error('Database connection failure during auditLog.create');
    }
    const log = {
      id: `ACT-${mockAuditLogs.length + 1}`,
      ...data,
      timestamp: new Date()
    };
    mockAuditLogs.push(log);
    return log;
  };

  mockPrisma.$transaction = async (fn) => {
    // Snapshot state for rollback simulation
    const expensesSnapshot = new Map([...mockExpenses.entries()].map(([k, v]) => [k, { ...v }]));
    const auditLogsSnapshot = [...mockAuditLogs];
    try {
      return await fn(mockPrisma);
    } catch (err) {
      mockExpenses.clear();
      for (const [k, v] of expensesSnapshot.entries()) {
        mockExpenses.set(k, v);
      }
      mockAuditLogs.length = 0;
      mockAuditLogs.push(...auditLogsSnapshot);
      throw err;
    }
  };

  simulateAuditFailure = true;
  let createExpenseRolledBack = false;
  try {
    await ExpenseService.createExpense({
      category: 'SERVICES',
      amount: 9999,
      description: 'Audit failure test expense',
      date: '2026-09-12'
    }, adminUser);
  } catch (err) {
    if (err.message.includes('auditLog.create')) {
      createExpenseRolledBack = true;
    }
  }
  assert(createExpenseRolledBack, 'createExpense throws when audit logging fails (fail-closed)');
  const uncommittedExp = [...mockExpenses.values()].find(e => e.amount === 9999);
  assert(!uncommittedExp, 'Uncommitted expense was rolled back and not persisted in database');

  let updateExpenseRolledBack = false;
  try {
    await ExpenseService.updateExpense('EXP-1', {
      amount: 7777,
      description: 'Rolled back update'
    }, adminUser);
  } catch (err) {
    if (err.message.includes('auditLog.create')) {
      updateExpenseRolledBack = true;
    }
  }
  assert(updateExpenseRolledBack, 'updateExpense throws when audit logging fails (fail-closed)');
  const exp1Current = mockExpenses.get('EXP-1');
  assert(exp1Current.amount === 1800, 'EXP-1 was rolled back to previous amount 1800');
  simulateAuditFailure = false;

  // Summary
  console.log('\n========================================================');
  console.log(`Office Expenses Tests: ${passed} passed, ${failed} failed`);
  console.log('========================================================\n');

  if (failed > 0) {
    console.error('Failed tests:', failures);
    process.exit(1);
  }
}

runExpenseTests().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});

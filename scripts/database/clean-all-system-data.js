/**
 * AfricaTravel — System Data Wipeout Script
 * 
 * Safely removes all operational transactional data (Tickets, Payments, Refunds,
 * Modifications, Customers, Notes, Visas, Expenses, and Audit Logs)
 * while preserving administrative user accounts and system configuration.
 */

import dotenv from 'dotenv';
dotenv.config();

import { getPrismaClient } from '../../backend/src/config/database.js';

const prisma = getPrismaClient();

async function cleanSystemData() {
  console.log('🔄 Connecting to database for system cleanup...');

  // 1. Pre-cleanup counts
  const pre = {
    users: await prisma.user.count(),
    customers: await prisma.customer.count(),
    customerNotes: await prisma.customerNote.count(),
    tickets: await prisma.ticket.count(),
    payments: await prisma.payment.count(),
    refunds: await prisma.refund.count(),
    modifications: await prisma.modification.count(),
    visas: await prisma.visa.count(),
    expenses: await prisma.expense.count(),
    auditLogs: await prisma.auditLog.count()
  };

  console.log('📊 Current Database Status:');
  console.table(pre);

  // 2. Safety check: Ensure at least one admin account exists before deleting anything
  const adminUser = await prisma.user.findFirst({
    where: {
      OR: [
        { id: 'EMP-101' },
        { email: 'admin@africatravel.com' },
        { role: 'ADMIN' }
      ]
    }
  });

  if (!adminUser) {
    console.error('❌ FATAL: No admin user found in database. Aborting cleanup to prevent lockout.');
    process.exit(1);
  }

  console.log(`🛡️ Admin protection confirmed: ${adminUser.name} (${adminUser.email}, ID: ${adminUser.id})`);

  // 3. Execute transactional deletion in correct foreign-key dependency order
  console.log('\n🧹 Clearing operational data...');

  await prisma.$transaction(async (tx) => {
    // A. Delete dependent financial records first (onDelete: Restrict)
    const delPayments = await tx.payment.deleteMany({});
    console.log(`  - Payments deleted: ${delPayments.count}`);

    const delRefunds = await tx.refund.deleteMany({});
    console.log(`  - Refunds deleted: ${delRefunds.count}`);

    const delModifications = await tx.modification.deleteMany({});
    console.log(`  - Modifications deleted: ${delModifications.count}`);

    // B. Delete Tickets
    const delTickets = await tx.ticket.deleteMany({});
    console.log(`  - Tickets deleted: ${delTickets.count}`);

    // C. Delete Customer Notes & Customers
    const delNotes = await tx.customerNote.deleteMany({});
    console.log(`  - Customer notes deleted: ${delNotes.count}`);

    const delCustomers = await tx.customer.deleteMany({});
    console.log(`  - Customers deleted: ${delCustomers.count}`);

    // D. Delete Visas
    const delVisas = await tx.visa.deleteMany({});
    console.log(`  - Visas deleted: ${delVisas.count}`);

    // E. Delete Expenses
    const delExpenses = await tx.expense.deleteMany({});
    console.log(`  - Expenses deleted: ${delExpenses.count}`);

    // F. Clear Audit Logs
    const delAudit = await tx.auditLog.deleteMany({});
    console.log(`  - Audit logs cleared: ${delAudit.count}`);
  });

  // 4. Post-cleanup verification counts
  const post = {
    users: await prisma.user.count(),
    customers: await prisma.customer.count(),
    customerNotes: await prisma.customerNote.count(),
    tickets: await prisma.ticket.count(),
    payments: await prisma.payment.count(),
    refunds: await prisma.refund.count(),
    modifications: await prisma.modification.count(),
    visas: await prisma.visa.count(),
    expenses: await prisma.expense.count(),
    auditLogs: await prisma.auditLog.count()
  };

  console.log('\n✅ Post-cleanup Database Status:');
  console.table(post);

  console.log('\n🎉 Cleanup successfully completed! System is fresh and ready.');
  await prisma.$disconnect();
}

cleanSystemData().catch(async (err) => {
  console.error('❌ Error executing data cleanup:', err);
  await prisma.$disconnect();
  process.exit(1);
});

import dotenv from 'dotenv';
dotenv.config();

import { PrismaClient } from '@prisma/client';

const directUrl = process.env.DIRECT_URL || process.env.DATABASE_URL;

if (!directUrl) {
  console.error('❌ DIRECT_URL or DATABASE_URL environment variable is missing.');
  process.exit(1);
}

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: directUrl
    }
  }
});

async function main() {
  console.log('🔍 Connecting to database...');
  
  // Pre-check
  const preUsers = await prisma.user.count();
  const preCustomers = await prisma.customer.count();
  const preTickets = await prisma.ticket.count();
  const preAudit = await prisma.auditLog.count();

  console.log('📊 Pre-cleanup counts:');
  console.log(`  Users:      ${preUsers}`);
  console.log(`  Customers:  ${preCustomers}`);
  console.log(`  Tickets:    ${preTickets}`);
  console.log(`  Audit Logs: ${preAudit}`);

  // Verify EMP-101 exists
  const adminUser = await prisma.user.findUnique({
    where: { id: 'EMP-101' }
  });

  if (!adminUser) {
    console.warn('⚠️ Warning: User EMP-101 not found by ID. Checking for admin@africatravel.com...');
    const adminByEmail = await prisma.user.findUnique({
      where: { email: 'admin@africatravel.com' }
    });
    if (!adminByEmail) {
      console.error('❌ FATAL: admin@africatravel.com does not exist! Aborting cleanup.');
      process.exit(1);
    }
    console.log(`✅ Admin account found by email: ${adminByEmail.email} (ID: ${adminByEmail.id})`);
  } else {
    console.log(`✅ Admin account verified: ${adminUser.email} (ID: ${adminUser.id})`);
  }

  console.log('\n🧹 Executing cleanup SQL statements in exact order...');

  const results = await prisma.$transaction(async (tx) => {
    // 1. Delete dependent financial records first (respecting ON DELETE RESTRICT)
    const mockTicketIds = "'TK-10254', 'TK-10253', 'TK-10252', 'TK-10251', 'TK-9824'";
    await tx.$executeRawUnsafe(`DELETE FROM payments WHERE "ticketId" IN (${mockTicketIds});`);
    await tx.$executeRawUnsafe(`DELETE FROM refunds WHERE "ticketId" IN (${mockTicketIds});`);
    await tx.$executeRawUnsafe(`DELETE FROM modifications WHERE "ticketId" IN (${mockTicketIds});`);

    const deletedTickets = await tx.$executeRawUnsafe(
      `DELETE FROM tickets WHERE id IN (${mockTicketIds});`
    );
    console.log(`  1. Tickets deleted: ${deletedTickets}`);

    // 2. Delete mock customers (cascades to customer notes)
    const deletedCustomers = await tx.$executeRawUnsafe(
      `DELETE FROM customers WHERE id IN ('CUST-8924', 'CUST-8925', 'CUST-8926', 'CUST-8927', 'CUST-8928');`
    );
    console.log(`  2. Customers deleted: ${deletedCustomers}`);

    // 3. Delete mock employees (cascades to refresh tokens)
    const deletedUsers = await tx.$executeRawUnsafe(
      `DELETE FROM users WHERE id IN ('EMP-102', 'EMP-103', 'EMP-104');`
    );
    console.log(`  3. Users deleted: ${deletedUsers}`);

    // 4. Delete associated audit logs
    const deletedAudit = await tx.$executeRawUnsafe(
      `DELETE FROM audit_logs
       WHERE "ticketId" IN ('TK-10254', 'TK-10253', 'TK-10252', 'TK-10251', 'TK-9824')
          OR "customerId" IN ('CUST-8924', 'CUST-8925', 'CUST-8926', 'CUST-8927', 'CUST-8928')
          OR "user" IN ('Ahmed Raafat', 'Nour Wael', 'Hashem Ahmed');`
    );
    console.log(`  4. Audit logs deleted: ${deletedAudit}`);

    return { deletedTickets, deletedCustomers, deletedUsers, deletedAudit };
  });

  // Post-check
  const postUsers = await prisma.user.count();
  const postCustomers = await prisma.customer.count();
  const postTickets = await prisma.ticket.count();
  const postAudit = await prisma.auditLog.count();

  console.log('\n📊 Post-cleanup verification counts:');
  console.log(`  Users:      ${postUsers} (Expected: 1)`);
  console.log(`  Customers:  ${postCustomers} (Expected: 0 or existing real customers)`);
  console.log(`  Tickets:    ${postTickets} (Expected: 0 or existing real tickets)`);
  console.log(`  Audit Logs: ${postAudit}`);

  const remainingUsers = await prisma.user.findMany({
    select: { id: true, name: true, email: true, role: true }
  });
  console.log('\n👤 Remaining User(s):', JSON.stringify(remainingUsers, null, 2));

  if (postUsers === 1 && remainingUsers[0].email === 'admin@africatravel.com') {
    console.log('\n✅ Cleanup completed successfully and verified!');
  } else {
    console.log('\nℹ️ Cleanup completed with current counts displayed above.');
  }

  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error('❌ Error during cleanup:', err);
  await prisma.$disconnect();
  process.exit(1);
});

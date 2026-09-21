#!/usr/bin/env node

/**
 * AfricaTravel — Preflight Financial CHECK Constraints Verifier
 *
 * Scans all financial records before validating database constraints:
 * - payments.amount > 0
 * - refunds.amount > 0
 * - expenses.amount > 0
 * - tickets.ticketPrice >= 0
 * - tickets.costPrice IS NULL OR >= 0
 * - modifications.changeFee >= 0
 * - modifications.airlineFee >= 0
 *
 * Exit codes:
 *   0: All records valid (or no database configured in environment)
 *   1: Violations discovered
 */

import { PrismaClient } from '@prisma/client';

export async function preflightCheckConstraints(prisma) {
  const client = prisma || new PrismaClient();
  const shouldDisconnect = !prisma;

  try {
    const [
      invalidPayments,
      invalidRefunds,
      invalidExpenses,
      negativeTickets,
      negativeCosts,
      invalidModFees
    ] = await Promise.all([
      client.payment.findMany({
        where: { amount: { lte: 0 } },
        select: { id: true, ticketId: true, amount: true, currency: true }
      }),
      client.refund.findMany({
        where: { amount: { lte: 0 } },
        select: { id: true, ticketId: true, amount: true, currency: true }
      }),
      client.expense.findMany({
        where: { amount: { lte: 0 } },
        select: { id: true, category: true, amount: true, description: true }
      }),
      client.ticket.findMany({
        where: { ticketPrice: { lt: 0 } },
        select: { id: true, ticketNumber: true, ticketPrice: true }
      }),
      client.ticket.findMany({
        where: { costPrice: { lt: 0 } },
        select: { id: true, ticketNumber: true, costPrice: true }
      }),
      client.modification.findMany({
        where: {
          OR: [
            { changeFee: { lt: 0 } },
            { airlineFee: { lt: 0 } }
          ]
        },
        select: { id: true, ticketId: true, changeFee: true, airlineFee: true }
      })
    ]);

    let totalViolations = 0;

    if (invalidPayments.length > 0) {
      console.error(`❌ Found ${invalidPayments.length} payment(s) with non-positive amount:`);
      invalidPayments.forEach(p => console.error(`  - Payment ${p.id} (Ticket ${p.ticketId}): ${p.amount} ${p.currency}`));
      totalViolations += invalidPayments.length;
    }

    if (invalidRefunds.length > 0) {
      console.error(`❌ Found ${invalidRefunds.length} refund(s) with non-positive amount:`);
      invalidRefunds.forEach(r => console.error(`  - Refund ${r.id} (Ticket ${r.ticketId}): ${r.amount} ${r.currency}`));
      totalViolations += invalidRefunds.length;
    }

    if (invalidExpenses.length > 0) {
      console.error(`❌ Found ${invalidExpenses.length} expense(s) with non-positive amount:`);
      invalidExpenses.forEach(e => console.error(`  - Expense ${e.id} [${e.category}]: ${e.amount} (${e.description})`));
      totalViolations += invalidExpenses.length;
    }

    if (negativeTickets.length > 0) {
      console.error(`❌ Found ${negativeTickets.length} ticket(s) with negative ticketPrice:`);
      negativeTickets.forEach(t => console.error(`  - Ticket ${t.id} (${t.ticketNumber}): ${t.ticketPrice}`));
      totalViolations += negativeTickets.length;
    }

    if (negativeCosts.length > 0) {
      console.error(`❌ Found ${negativeCosts.length} ticket(s) with negative costPrice:`);
      negativeCosts.forEach(t => console.error(`  - Ticket ${t.id} (${t.ticketNumber}): ${t.costPrice}`));
      totalViolations += negativeCosts.length;
    }

    if (invalidModFees.length > 0) {
      console.error(`❌ Found ${invalidModFees.length} modification(s) with negative fees:`);
      invalidModFees.forEach(m => console.error(`  - Modification ${m.id} (Ticket ${m.ticketId}): changeFee=${m.changeFee}, airlineFee=${m.airlineFee}`));
      totalViolations += invalidModFees.length;
    }

    if (totalViolations === 0) {
      console.log('✅ Financial constraint preflight passed: 0 violating records found across all tables.');
      return true;
    }

    console.error(`\n💥 Total constraint violations: ${totalViolations}`);
    return false;
  } catch (err) {
    console.error('Constraint preflight check error:', err.message);
    throw err;
  } finally {
    if (shouldDisconnect) {
      await client.$disconnect();
    }
  }
}

// Direct CLI invocation
if (process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/'))) {
  preflightCheckConstraints()
    .then(passed => process.exit(passed ? 0 : 1))
    .catch(() => process.exit(1));
}

#!/usr/bin/env node

/**
 * AfricaTravel — Zero-Cost Ticket Audit Reporter
 *
 * Discovers and lists all tickets in the system where costPrice = 0 and ticketPrice > 0
 * for administrative and financial review.
 *
 * NOTE: As per system audit requirements, this script does NOT automatically modify
 * or update any legacy records. It produces a structured audit report for manual review.
 *
 * Usage:
 *   node scripts/database/report-zero-cost-tickets.js
 */

import { PrismaClient } from '@prisma/client';

export async function reportZeroCostTickets(prisma) {
  const client = prisma || new PrismaClient();
  const shouldDisconnect = !prisma;

  try {
    const zeroCostTickets = await client.ticket.findMany({
      where: {
        costPrice: 0,
        ticketPrice: { gt: 0 },
        deletedAt: null
      },
      select: {
        id: true,
        ticketNumber: true,
        pnr: true,
        passengerName: true,
        airline: true,
        ticketPrice: true,
        costPrice: true,
        currency: true,
        status: true,
        createdBy: true,
        createdAt: true
      },
      orderBy: { createdAt: 'desc' }
    });

    console.log('\n========================================================');
    console.log('   AfricaTravel — Zero Cost Ticket Audit Report');
    console.log('========================================================\n');

    if (zeroCostTickets.length === 0) {
      console.log('✅ No tickets found with costPrice = 0 and ticketPrice > 0.');
      console.log('   All tickets have either recorded cost prices or explicitly unrecorded (null) costs.\n');
      return [];
    }

    console.log(`⚠️  Discovered ${zeroCostTickets.length} ticket(s) with costPrice = 0 and ticketPrice > 0:`);
    console.log('---------------------------------------------------------------------------------------------------------');
    console.log('| ID               | Ticket #       | PNR    | Passenger            | Price       | Currency | Status     |');
    console.log('---------------------------------------------------------------------------------------------------------');

    zeroCostTickets.forEach(t => {
      const id = (t.id || '').padEnd(16);
      const num = (t.ticketNumber || '-').padEnd(14);
      const pnr = (t.pnr || '-').padEnd(6);
      const name = (t.passengerName || 'Unknown').slice(0, 20).padEnd(20);
      const price = String(t.ticketPrice).padStart(11);
      const curr = (t.currency || 'EGP').padEnd(8);
      const status = (t.status || 'CONFIRMED').padEnd(10);
      console.log(`| ${id} | ${num} | ${pnr} | ${name} | ${price} | ${curr} | ${status} |`);
    });

    console.log('---------------------------------------------------------------------------------------------------------');
    console.log(`\nTotal flagged tickets for review: ${zeroCostTickets.length}`);
    console.log('Action: Review these tickets to determine whether actual supplier cost should be backfilled or set to NULL.\n');

    return zeroCostTickets;
  } catch (err) {
    console.error('Failed to generate zero cost ticket report:', err.message);
    throw err;
  } finally {
    if (shouldDisconnect) {
      await client.$disconnect();
    }
  }
}

// Direct CLI invocation
if (process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/'))) {
  reportZeroCostTickets()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

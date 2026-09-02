#!/usr/bin/env node

/**
 * AfricaTravel — Preflight Database Integrity Checker
 *
 * Scans customers.passport and tickets.pnr for duplicate values without modifying
 * any data. Ignores NULL, empty strings, and whitespace-only values.
 *
 * Exit codes:
 *   0: Integrity check passed (no duplicates)
 *   1: Duplicates found or database connection error
 */

import { PrismaClient } from '@prisma/client';

export async function checkUniqueIntegrity(prisma) {
  const client = prisma || new PrismaClient();
  let shouldDisconnect = !prisma;

  try {
    // Query duplicate customer passports (ignoring null and whitespace-only)
    const duplicatePassports = await client.$queryRaw`
      SELECT BTRIM("passport") AS val, COUNT(*)::int AS count
      FROM "customers"
      WHERE "passport" IS NOT NULL
        AND BTRIM("passport") <> ''
      GROUP BY BTRIM("passport")
      HAVING COUNT(*) > 1
      ORDER BY count DESC, val ASC
    `;

    // Query duplicate ticket PNRs (ignoring null and whitespace-only)
    const duplicatePnrs = await client.$queryRaw`
      SELECT BTRIM("pnr") AS val, COUNT(*)::int AS count
      FROM "tickets"
      WHERE "pnr" IS NOT NULL
        AND BTRIM("pnr") <> ''
      GROUP BY BTRIM("pnr")
      HAVING COUNT(*) > 1
      ORDER BY count DESC, val ASC
    `;

    const hasPassportDups = Array.isArray(duplicatePassports) && duplicatePassports.length > 0;
    const hasPnrDups = Array.isArray(duplicatePnrs) && duplicatePnrs.length > 0;

    if (hasPassportDups || hasPnrDups) {
      console.error('\n❌ Unique integrity preflight failed.\n');

      if (hasPassportDups) {
        console.error(`Duplicate customer passports: ${duplicatePassports.length}`);
        duplicatePassports.forEach(row => {
          console.error(`- ${row.val}: ${row.count} records`);
        });
        console.error('');
      }

      if (hasPnrDups) {
        console.error(`Duplicate ticket PNRs: ${duplicatePnrs.length}`);
        duplicatePnrs.forEach(row => {
          console.error(`- ${row.val}: ${row.count} records`);
        });
        console.error('');
      }

      console.error('No data was modified.\n');
      return {
        passed: false,
        passports: duplicatePassports,
        pnrs: duplicatePnrs
      };
    }

    console.log('\n✅ Unique integrity preflight passed.');
    console.log('No duplicate Passport or PNR values found.\n');
    return {
      passed: true,
      passports: [],
      pnrs: []
    };
  } finally {
    if (shouldDisconnect) {
      await client.$disconnect().catch(() => {});
    }
  }
}

// Direct execution from CLI
const isDirectRun = process.argv[1] && (
  process.argv[1].endsWith('check-unique-integrity.js') ||
  process.argv[1].endsWith('check-unique-integrity')
);

if (isDirectRun) {
  checkUniqueIntegrity()
    .then(result => {
      process.exit(result.passed ? 0 : 1);
    })
    .catch(err => {
      console.error('\n❌ Database connection or query error during preflight check:');
      console.error(err.message || err);
      process.exit(1);
    });
}

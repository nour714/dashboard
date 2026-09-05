/**
 * AfricaTravel — Customer Page Performance & Ticket Grouping Verification Tests
 *
 * Verifies:
 * 1. CustomerService.buildTicketsByCustomerMap groups tickets by customerId accurately.
 * 2. CustomerService.getCustomerStats with ticketsByCustomerMap yields identical results to fallback.
 * 3. Handles edge cases: customers with 0 tickets, tickets with no customerId, non-existent customerId.
 * 4. Benchmarks O(1) Map lookup vs O(M) filter across 500 customers and 2,500 tickets.
 * 5. Verifies js/pages/customers.js uses buildTicketsByCustomerMap once before loops.
 */

import { CustomerService } from '../js/services/customer-service.js';
import { store } from '../js/state/store.js';
import fs from 'fs';
import path from 'path';

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

async function runPerformanceTests() {
  console.log('\n⚡ ========================================================');
  console.log('   AfricaTravel Customer Performance Verification Tests');
  console.log('========================================================\n');

  // Preserve original store state
  const originalState = store.getState();

  // --- 1. Functional Correctness & Grouping ---
  console.log('--- 1. Ticket Grouping & Correctness ---');

  const mockCustomers = [
    { id: 'CUST-001', name: 'Ahmed Ali', phone: '+201001111111', email: 'ahmed@example.com' },
    { id: 'CUST-002', name: 'Sara Hassan', phone: '+201002222222', email: 'sara@example.com' },
    { id: 'CUST-003', name: 'Omar Khaled', phone: '+201003333333', email: 'omar@example.com' },
    { id: 'CUST-004', name: 'Mona Youssef', phone: '+201004444444', email: 'mona@example.com' } // 0 tickets
  ];

  const mockTickets = [
    { id: 'TK-1', customerId: 'CUST-001', ticketPrice: 5000, payments: [{ amount: 5000, status: 'COMPLETED' }], refunds: [] },
    { id: 'TK-2', customerId: 'CUST-001', ticketPrice: 7000, payments: [{ amount: 3000, status: 'COMPLETED' }], refunds: [] },
    { id: 'TK-3', customerId: 'CUST-002', ticketPrice: 12000, payments: [{ amount: 12000, status: 'COMPLETED' }], refunds: [{ amount: 2000, status: 'COMPLETED' }] },
    { id: 'TK-4', customerId: 'CUST-003', ticketPrice: 3000, payments: [], refunds: [] },
    { id: 'TK-5', customerId: null, ticketPrice: 4000, payments: [], refunds: [] } // orphan ticket without customerId
  ];

  // Hydrate store state for testing
  store.state = {
    ...originalState,
    customers: mockCustomers,
    tickets: mockTickets
  };

  const map = CustomerService.buildTicketsByCustomerMap();
  assert(map instanceof Map, 'buildTicketsByCustomerMap returns a Map instance');
  assert(map.get('CUST-001')?.length === 2, 'CUST-001 has exactly 2 tickets in map');
  assert(map.get('CUST-002')?.length === 1, 'CUST-002 has exactly 1 ticket in map');
  assert(map.get('CUST-003')?.length === 1, 'CUST-003 has exactly 1 ticket in map');
  assert(!map.has('CUST-004'), 'CUST-004 (no tickets) is omitted or empty in map');
  assert(!map.has(null), 'Orphan tickets with null customerId are ignored in map');

  // --- 2. Identity of Stats (Map vs Fallback) ---
  console.log('\n--- 2. Parity Between Map and Fallback Lookup ---');
  for (const c of mockCustomers) {
    const statsWithoutMap = CustomerService.getCustomerStats(c.id);
    const statsWithMap = CustomerService.getCustomerStats(c.id, map);

    assert(statsWithMap.ticketCount === statsWithoutMap.ticketCount, `${c.name}: ticketCount matches (${statsWithMap.ticketCount})`);
    assert(statsWithMap.totalSpent === statsWithoutMap.totalSpent, `${c.name}: totalSpent matches (${statsWithMap.totalSpent})`);
    assert(statsWithMap.totalPaid === statsWithoutMap.totalPaid, `${c.name}: totalPaid matches (${statsWithMap.totalPaid})`);
    assert(statsWithMap.totalRefunded === statsWithoutMap.totalRefunded, `${c.name}: totalRefunded matches (${statsWithMap.totalRefunded})`);
    assert(statsWithMap.totalOutstanding === statsWithoutMap.totalOutstanding, `${c.name}: totalOutstanding matches (${statsWithMap.totalOutstanding})`);
    assert(statsWithMap.tickets.length === statsWithoutMap.tickets.length, `${c.name}: tickets array length matches`);
  }

  // --- 3. Edge Cases ---
  console.log('\n--- 3. Edge Cases Handling ---');
  const zeroTicketStats = CustomerService.getCustomerStats('CUST-004', map);
  assert(zeroTicketStats.ticketCount === 0, 'Customer with 0 tickets returns ticketCount = 0');
  assert(zeroTicketStats.totalSpent === 0, 'Customer with 0 tickets returns totalSpent = 0');
  assert(zeroTicketStats.totalPaid === 0, 'Customer with 0 tickets returns totalPaid = 0');
  assert(zeroTicketStats.tickets.length === 0, 'Customer with 0 tickets returns empty tickets array');

  const nonExistentStats = CustomerService.getCustomerStats('CUST-NON-EXISTENT', map);
  assert(nonExistentStats.ticketCount === 0, 'Non-existent customer returns ticketCount = 0');
  assert(nonExistentStats.tickets.length === 0, 'Non-existent customer returns empty tickets array');

  // --- 4. Performance Benchmark (500 Customers x 2,500 Tickets) ---
  console.log('\n--- 4. Benchmark: O(N * M) vs O(N + M) ---');
  const benchCustomers = [];
  const benchTickets = [];

  for (let i = 0; i < 500; i++) {
    const cid = `BENCH-CUST-${i}`;
    benchCustomers.push({ id: cid, name: `Customer ${i}` });
  }

  for (let j = 0; j < 2500; j++) {
    const cid = `BENCH-CUST-${j % 500}`;
    benchTickets.push({
      id: `BENCH-TK-${j}`,
      customerId: cid,
      ticketPrice: 2000 + (j % 5000),
      payments: [{ amount: 1000, status: 'COMPLETED' }],
      refunds: []
    });
  }

  store.state = {
    ...originalState,
    customers: benchCustomers,
    tickets: benchTickets
  };

  // Benchmark A: Repeated filter in loop (Before)
  const startBefore = performance.now();
  const resultsBefore = [];
  for (const c of benchCustomers) {
    resultsBefore.push(CustomerService.getCustomerStats(c.id));
  }
  const durationBefore = performance.now() - startBefore;

  // Benchmark B: Single Map pre-aggregation (After)
  const startAfter = performance.now();
  const benchMap = CustomerService.buildTicketsByCustomerMap();
  const resultsAfter = [];
  for (const c of benchCustomers) {
    resultsAfter.push(CustomerService.getCustomerStats(c.id, benchMap));
  }
  const durationAfter = performance.now() - startAfter;

  console.log(`  ⏱️  Before (Repeated Filter): ${durationBefore.toFixed(2)} ms for 500 customers x 2,500 tickets`);
  console.log(`  ⏱️  After (Map Pre-grouping):  ${durationAfter.toFixed(2)} ms for 500 customers x 2,500 tickets`);
  const speedup = durationBefore / Math.max(durationAfter, 0.01);
  console.log(`  🚀 Speedup: ${speedup.toFixed(1)}x faster`);

  assert(durationAfter < durationBefore, 'Map pre-grouping is measurably faster than repeated filter');
  assert(resultsBefore.length === resultsAfter.length, 'Result counts match across benchmark');
  assert(resultsAfter[0].ticketCount === resultsBefore[0].ticketCount, 'Result content matches across benchmark');

  // --- 5. Static Code Inspection of customers.js ---
  console.log('\n--- 5. Static Code Inspection of js/pages/customers.js ---');
  const customersJsContent = fs.readFileSync(path.resolve('js/pages/customers.js'), 'utf8');

  assert(customersJsContent.includes('CustomerService.buildTicketsByCustomerMap()'), 'customers.js invokes CustomerService.buildTicketsByCustomerMap()');
  assert(customersJsContent.includes('CustomerService.getCustomerStats(c.id, map)'), 'customers.js passes pre-built map to CustomerService.getCustomerStats');
  assert(customersJsContent.includes('renderCustomerRows(customers, ticketsByCustomerMap)'), 'render passes ticketsByCustomerMap to renderCustomerRows');
  assert(customersJsContent.includes('renderCustomerCards(customers, ticketsByCustomerMap)'), 'render passes ticketsByCustomerMap to renderCustomerCards');

  // Restore original state
  store.state = originalState;

  console.log('\n========================================================');
  console.log(`Customer Performance Tests: ${passed} passed, ${failed} failed`);
  console.log('========================================================\n');

  if (failed > 0) {
    console.error('Failed tests:', failures);
    process.exit(1);
  }
}

runPerformanceTests().catch(err => {
  console.error('Test suite error:', err);
  process.exit(1);
});

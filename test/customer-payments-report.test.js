/**
 * AfricaTravel - Customer Payments Report Integration Test Suite
 */

import http from 'http';
import { createApp } from '../server/src/app.js';
import { AuthService } from '../server/src/services/auth.service.js';
import { ReportService as ServerReportService } from '../server/src/services/report.service.js';
import { CustomerService } from '../server/src/services/customer.service.js';
import * as dbModule from '../server/src/config/database.js';
import { store } from '../js/state/store.js';
import { ReportService as FrontendReportService } from '../js/services/report-service.js';
import { ReportsPage } from '../js/pages/reports.js';
import { en } from '../js/i18n/locales/en.js';
import { ar } from '../js/i18n/locales/ar.js';

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

function makeRequest(server, { method = 'GET', path = '/', headers = {}, body = null }) {
  return new Promise((resolve, reject) => {
    const address = server.address();
    const reqHeaders = { ...headers };

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

async function runCustomerPaymentsReportTests() {
  console.log('\n📊 ========================================================');
  console.log('   Customer Payments Report Integration Tests');
  console.log('========================================================\n');

  // Mock Database State
  const mockTickets = [
    {
      id: 'TK-101',
      ticketNumber: '077-1000000001',
      customerId: 'CUST-01',
      passengerName: 'Ayman Nour',
      ticketPrice: 10000,
      tripType: 'One Way',
      customer: { id: 'CUST-01', name: 'Ayman Nour' },
      payments: [{ amount: 4000 }]
    },
    {
      id: 'TK-102',
      ticketNumber: '077-1000000002',
      customerId: 'CUST-01',
      passengerName: 'Ayman Nour',
      ticketPrice: 15000,
      tripType: 'Round Trip',
      customer: { id: 'CUST-01', name: 'Ayman Nour' },
      payments: [{ amount: 15000 }]
    },
    {
      id: 'TK-103',
      ticketNumber: '077-1000000003',
      customerId: 'CUST-02',
      passengerName: 'Bassem Youssef',
      ticketPrice: 8000,
      tripType: 'One Way',
      customer: { id: 'CUST-02', name: 'Bassem Youssef' },
      payments: [{ amount: 8000 }]
    }
  ];

  const mockPrisma = {
    ticket: {
      findMany: async ({ include, orderBy }) => {
        return [...mockTickets];
      }
    }
  };

  dbModule.setPrismaClient(mockPrisma);

  // --- 1. Backend Service Unit Verification ---
  console.log('--- 1. Backend ReportService.getCustomerPayments() ---');
  const serverRows = await ServerReportService.getCustomerPayments();
  assert(Array.isArray(serverRows), 'Returns an array of customer payment breakdown rows');
  assert(serverRows.length === 3, 'Returns one row per ticket (3 tickets = 3 rows)');

  const row1 = serverRows.find(r => r.ticketId === 'TK-101');
  assert(row1.customerName === 'Ayman Nour', 'Row 1 customerName matches');
  assert(row1.totalPaid === 4000, 'Row 1 totalPaid is 4000');
  assert(row1.totalRemaining === 6000, 'Row 1 totalRemaining is 6000 (10000 - 4000)');
  assert(row1.tripType === 'One Way', 'Row 1 tripType is One Way');

  const row2 = serverRows.find(r => r.ticketId === 'TK-102');
  assert(row2.customerName === 'Ayman Nour', 'Row 2 customerName matches (same customer, second ticket)');
  assert(row2.totalPaid === 15000, 'Row 2 totalPaid is 15000');
  assert(row2.totalRemaining === 0, 'Row 2 totalRemaining is 0 (fully paid)');
  assert(row2.tripType === 'Round Trip', 'Row 2 tripType is Round Trip');

  // --- 2. Backend HTTP API Endpoint Verification ---
  console.log('\n--- 2. Backend HTTP API GET /api/reports/customer-payments ---');
  const app = createApp();
  const server = http.createServer(app);

  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));

  try {
    // Unauthenticated
    const unauthedRes = await makeRequest(server, {
      method: 'GET',
      path: '/api/reports/customer-payments'
    });
    assert(unauthedRes.statusCode === 401, 'GET /api/reports/customer-payments without auth returns 401');

    // Authenticated as AGENT
    const agentToken = AuthService.generateAccessToken({
      id: 'EMP-103',
      name: 'Nour Wael',
      email: 'nour.w@africatravel.com',
      role: 'AGENT',
      title: 'Ticketing Officer'
    });

    const authedRes = await makeRequest(server, {
      method: 'GET',
      path: '/api/reports/customer-payments',
      headers: { 'Authorization': `Bearer ${agentToken}` }
    });

    assert(authedRes.statusCode === 200, 'GET /api/reports/customer-payments as AGENT returns 200');
    assert(authedRes.json?.success === true, 'Response envelope has success: true');
    assert(Array.isArray(authedRes.json?.data), 'Response data contains rows array');
    assert(authedRes.json?.data.length === 3, 'Response data contains 3 rows');
  } finally {
    server.close();
  }

  // --- 3. Frontend Store & ReportService Verification ---
  console.log('\n--- 3. Frontend Store & ReportService Breakdown ---');
  store.state = {
    ...store.state,
    tickets: mockTickets,
    customers: [
      { id: 'CUST-01', name: 'Ayman Nour' },
      { id: 'CUST-02', name: 'Bassem Youssef' }
    ],
    employees: []
  };

  const frontendRows = FrontendReportService.getCustomerPayments();
  assert(frontendRows.length === 3, 'Frontend ReportService returns 3 rows from state');
  assert(frontendRows[0].customerName === 'Ayman Nour', 'First row is sorted alphabetically by customer');

  // --- 4. ReportsPage UI Rendering Verification ---
  console.log('\n--- 4. ReportsPage UI Table Rendering ---');
  const pageHtml = ReportsPage.render();
  assert(pageHtml.includes('Customer Payments'), 'Reports page contains Customer Payments section title');
  assert(pageHtml.includes('Ayman Nour'), 'Reports page renders customer name Ayman Nour');
  assert(pageHtml.includes('077-1000000001'), 'Reports page renders ticket number 077-1000000001');
  assert(pageHtml.includes('077-1000000002'), 'Reports page renders second ticket for same customer separately');
  assert(pageHtml.includes('badge-accent'), 'Reports page uses badge-accent for Round Trip');
  assert(pageHtml.includes('badge-neutral'), 'Reports page uses badge-neutral for One Way');

  // Empty state test
  store.state = {
    ...store.state,
    tickets: [],
    customers: []
  };
  const emptyPageHtml = ReportsPage.render();
  assert(emptyPageHtml.includes('No records found'), 'Reports page renders empty state when no tickets exist');

  // --- 5. i18n Translations Verification ---
  console.log('\n--- 5. i18n Bilingual Verification ---');
  assert(en.reports.customerPayments.title === 'Customer Payments', 'EN reports.customerPayments.title is defined');
  assert(ar.reports.customerPayments.title === 'مدفوعات العملاء', 'AR reports.customerPayments.title is defined');
  assert(en.reports.customerPayments.oneWay === 'One Way', 'EN reports.customerPayments.oneWay is defined');
  assert(ar.reports.customerPayments.oneWay === 'ذهاب فقط', 'AR reports.customerPayments.oneWay is defined');
  assert(en.reports.customerPayments.roundTrip === 'Round Trip', 'EN reports.customerPayments.roundTrip is defined');
  assert(ar.reports.customerPayments.roundTrip === 'ذهاب وعودة', 'AR reports.customerPayments.roundTrip is defined');

  // --- 6. Floating-Point Precision Aggregation Regression Tests (Decimal.js) ---
  console.log('\n--- 6. Floating-Point Precision Aggregation Regression Tests ---');
  // Prices: 10.10, 20.20, 5.05, 100.01 (exact sum = 135.36; float math produces 135.35999999999999)
  // Payments: 1.10, 2.20, 3.30 (exact sum = 6.60; float math produces 6.6000000000000005)
  // Refunds: 0.10, 0.20 (exact sum = 0.30; float math produces 0.30000000000000004)
  const trapTickets = [
    {
      id: 'TK-TRAP-1',
      ticketNumber: '077-9000000001',
      customerId: 'CUST-TRAP',
      passengerName: 'Precision Test',
      ticketPrice: 10.10,
      airline: 'TrapAir',
      airlineCode: 'TP',
      tripType: 'One Way',
      payments: [{ amount: 1.10 }],
      refunds: [{ amount: 0.10, status: 'COMPLETED' }],
      modifications: []
    },
    {
      id: 'TK-TRAP-2',
      ticketNumber: '077-9000000002',
      customerId: 'CUST-TRAP',
      passengerName: 'Precision Test',
      ticketPrice: 20.20,
      airline: 'TrapAir',
      airlineCode: 'TP',
      tripType: 'One Way',
      payments: [{ amount: 2.20 }],
      refunds: [{ amount: 0.20, status: 'COMPLETED' }],
      modifications: []
    },
    {
      id: 'TK-TRAP-3',
      ticketNumber: '077-9000000003',
      customerId: 'CUST-TRAP',
      passengerName: 'Precision Test',
      ticketPrice: 5.05,
      airline: 'TrapAir',
      airlineCode: 'TP',
      tripType: 'One Way',
      payments: [{ amount: 3.30 }],
      refunds: [],
      modifications: []
    },
    {
      id: 'TK-TRAP-4',
      ticketNumber: '077-9000000004',
      customerId: 'CUST-TRAP',
      passengerName: 'Precision Test',
      ticketPrice: 100.01,
      airline: 'TrapAir',
      airlineCode: 'TP',
      tripType: 'One Way',
      payments: [],
      refunds: [],
      modifications: []
    }
  ];

  const trapCustomer = {
    id: 'CUST-TRAP',
    name: 'Precision Test Customer',
    deletedAt: null,
    notes: [],
    tickets: trapTickets
  };

  const trapMockPrisma = {
    ticket: {
      findMany: async () => [...trapTickets]
    },
    customer: {
      findUnique: async ({ where }) => (where.id === 'CUST-TRAP' ? trapCustomer : null)
    }
  };

  dbModule.setPrismaClient(trapMockPrisma);

  // 6.1 ReportService KPI aggregation exact precision checks
  const kpis = await ServerReportService.getSummaryKPIs();
  assert(kpis.totalSales === 135.36, `ReportService totalSales exact decimal sum (${kpis.totalSales} === 135.36)`);
  assert(kpis.totalCollected === 6.6, `ReportService totalCollected exact decimal sum (${kpis.totalCollected} === 6.6)`);
  assert(kpis.totalRefunds === 0.3, `ReportService totalRefunds exact decimal sum (${kpis.totalRefunds} === 0.3)`);
  assert(kpis.totalOutstanding === 128.76, `ReportService totalOutstanding exact decimal sum (${kpis.totalOutstanding} === 128.76)`);

  // 6.2 ReportService Airline Performance aggregation exact precision checks
  const airlinePerf = await ServerReportService.getAirlinePerformance();
  const trapAir = airlinePerf.find(a => a.airline === 'TrapAir');
  assert(trapAir && trapAir.totalRevenue === 135.36, `ReportService airline totalRevenue exact decimal sum (${trapAir?.totalRevenue} === 135.36)`);
  assert(trapAir && trapAir.totalRefunded === 0.3, `ReportService airline totalRefunded exact decimal sum (${trapAir?.totalRefunded} === 0.3)`);

  // 6.3 CustomerService Lifetime stats aggregation exact precision checks
  const customerResult = await CustomerService.getCustomerById('CUST-TRAP');
  assert(customerResult !== null, 'CustomerService.getCustomerById returns customer record');
  assert(customerResult.stats.totalSpent === 135.36, `CustomerService totalSpent exact decimal sum (${customerResult.stats.totalSpent} === 135.36)`);
  assert(customerResult.stats.totalPaid === 6.6, `CustomerService totalPaid exact decimal sum (${customerResult.stats.totalPaid} === 6.6)`);
  assert(customerResult.stats.totalRefunded === 0.3, `CustomerService totalRefunded exact decimal sum (${customerResult.stats.totalRefunded} === 0.3)`);
  assert(customerResult.stats.totalOutstanding === 128.76, `CustomerService totalOutstanding exact decimal sum (${customerResult.stats.totalOutstanding} === 128.76)`);

  console.log('\n========================================================');
  console.log(`Customer Payments Report Tests: ${passed} passed, ${failed} failed`);
  console.log('========================================================\n');

  if (failures.length > 0) {
    process.exit(1);
  }
}

runCustomerPaymentsReportTests();

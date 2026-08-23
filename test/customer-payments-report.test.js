/**
 * AfricaTravel - Customer Payments Report Integration Test Suite
 */

import http from 'http';
import { createApp } from '../server/src/app.js';
import { AuthService } from '../server/src/services/auth.service.js';
import { ReportService as ServerReportService } from '../server/src/services/report.service.js';
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

  console.log('\n========================================================');
  console.log(`Customer Payments Report Tests: ${passed} passed, ${failed} failed`);
  console.log('========================================================\n');

  if (failures.length > 0) {
    process.exit(1);
  }
}

runCustomerPaymentsReportTests();

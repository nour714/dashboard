/**
 * AfricaTravel - RBAC Frontend UI & Role Visibility Tests
 */

import { renderSidebar } from '../js/components/sidebar.js';
import { renderBottomNav } from '../js/components/bottom-nav.js';
import { EmployeesPage } from '../js/pages/employees.js';
import { ReportsPage } from '../js/pages/reports.js';
import { store } from '../js/state/store.js';
import { AuthService } from '../js/services/auth-service.js';

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

async function runRbacUiTests() {
  console.log('\n🛡️ ========================================================');
  console.log('   RBAC UI Role-Based Visibility Tests');
  console.log('========================================================\n');

  // 1. Test as AGENT role
  console.log('--- 1. AGENT Role Visibility ---');
  store.state.currentUser = {
    id: 'USR-AGENT',
    name: 'Nour Agent',
    role: 'AGENT',
    title: 'Ticketing Agent'
  };

  const agentSidebar = renderSidebar('/dashboard');
  assert(!agentSidebar.includes('href="/employees"'), 'Sidebar does NOT contain /employees link for AGENT');
  assert(agentSidebar.includes('href="/tickets"'), 'Sidebar contains /tickets link for AGENT');
  assert(agentSidebar.includes('href="/activity"'), 'Sidebar contains /activity link for AGENT');
  assert(agentSidebar.includes('href="/settings"'), 'Sidebar contains /settings link for AGENT');
  assert(agentSidebar.includes('id="sidebar-sign-out-btn"'), 'Sidebar contains #sidebar-sign-out-btn for AGENT');

  const agentBottomNav = renderBottomNav('/dashboard');
  assert(!agentBottomNav.includes('href="/employees"'), 'Mobile drawer does NOT contain /employees link for AGENT');
  assert(agentBottomNav.includes('href="/payments"'), 'Mobile drawer contains /payments link for AGENT');

  const agentEmployeesPage = EmployeesPage.render();
  assert(agentEmployeesPage.includes('Access Restricted') || agentEmployeesPage.includes('الوصول مقيد'), 'Employees page shows Access Restricted for AGENT');
  assert(!agentEmployeesPage.includes('data-table'), 'Employees page does NOT render table for AGENT');

  const agentReportsPage = ReportsPage.render();
  assert(agentReportsPage.includes('Employee performance data requires administrator access') || agentReportsPage.includes('بيانات أداء الموظفين تتطلب صلاحيات المسؤول'), 'Reports page indicates admin-only access for agent performance to AGENT');

  // 2. Test as ADMIN role
  console.log('\n--- 2. ADMIN Role Visibility ---');
  store.state.currentUser = {
    id: 'USR-ADMIN',
    name: 'Admin User',
    role: 'ADMIN',
    title: 'Senior Operations Director'
  };

  const adminSidebar = renderSidebar('/dashboard');
  assert(adminSidebar.includes('href="/employees"'), 'Sidebar DOES contain /employees link for ADMIN');
  assert(adminSidebar.includes('id="sidebar-sign-out-btn"'), 'Sidebar contains #sidebar-sign-out-btn for ADMIN');

  const adminBottomNav = renderBottomNav('/dashboard');
  assert(adminBottomNav.includes('href="/employees"'), 'Mobile drawer DOES contain /employees link for ADMIN');

  const adminEmployeesPage = EmployeesPage.render();
  assert(!adminEmployeesPage.includes('Access Restricted') && !adminEmployeesPage.includes('الوصول مقيد'), 'Employees page does NOT show Access Restricted for ADMIN');
  assert(adminEmployeesPage.includes('data-table'), 'Employees page renders employees table for ADMIN');

  // 3. Test TICKET_ONLY navigation visibility
  console.log('\n--- 3. TICKET_ONLY Role Visibility ---');
  store.state.currentUser = {
    id: 'USR-TICKET-ONLY',
    name: 'Ticket Only User',
    role: 'TICKET_ONLY',
    title: 'Ticket Creation Officer'
  };
  const ticketOnlySidebar = renderSidebar('/tickets/new');
  assert(ticketOnlySidebar.includes('href="/tickets/new"'), 'Sidebar retains Create Ticket link for TICKET_ONLY');
  assert(ticketOnlySidebar.includes('id="sidebar-sign-out-btn"'), 'Sidebar retains #sidebar-sign-out-btn for TICKET_ONLY');
  assert(!ticketOnlySidebar.includes('href="/dashboard"'), 'Sidebar hides Dashboard for TICKET_ONLY');
  assert(!ticketOnlySidebar.includes('href="/customers"'), 'Sidebar hides Customers for TICKET_ONLY');
  assert(!ticketOnlySidebar.includes('href="/reports"'), 'Sidebar hides Reports for TICKET_ONLY');

  const ticketOnlyBottomNav = renderBottomNav('/tickets/new');
  assert(ticketOnlyBottomNav.includes('href="/tickets/new"'), 'Mobile nav retains Create Ticket for TICKET_ONLY');
  assert(!ticketOnlyBottomNav.includes('href="/customers"'), 'Mobile nav hides Customers for TICKET_ONLY');

  console.log('\n========================================================');
  console.log(`RBAC UI Tests: ${passed} passed, ${failed} failed`);
  console.log('========================================================\n');

  if (failures.length > 0) {
    process.exit(1);
  }
}

runRbacUiTests();

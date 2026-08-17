/**
 * AfricaTravel — Route Definitions
 */

import { LoginPage } from '../pages/login.js';
import { DashboardPage } from '../pages/dashboard.js';
import { TicketsPage } from '../pages/tickets.js';
import { TicketCreatePage } from '../pages/ticket-create.js';
import { TicketDetailsPage } from '../pages/ticket-details.js';
import { CustomersPage } from '../pages/customers.js';
import { CustomerDetailsPage } from '../pages/customer-details.js';
import { PaymentsPage } from '../pages/payments.js';
import { RefundsPage } from '../pages/refunds.js';
import { ReportsPage } from '../pages/reports.js';
import { EmployeesPage } from '../pages/employees.js';
import { ActivityPage } from '../pages/activity.js';
import { SettingsPage } from '../pages/settings.js';

export const routes = [
  { path: '/login', ...LoginPage, isAuthOnly: true },
  { path: '/dashboard', ...DashboardPage },
  { path: '/tickets/new', ...TicketCreatePage },
  { path: '/tickets/:id/payments', ...TicketDetailsPage },
  { path: '/tickets/:id/modifications', ...TicketDetailsPage },
  { path: '/tickets/:id/refunds', ...TicketDetailsPage },
  { path: '/tickets/:id', ...TicketDetailsPage },
  { path: '/tickets', ...TicketsPage },
  { path: '/customers/:id', ...CustomerDetailsPage },
  { path: '/customers', ...CustomersPage },
  { path: '/payments', ...PaymentsPage },
  { path: '/refunds', ...RefundsPage },
  { path: '/reports', ...ReportsPage },
  { path: '/employees', ...EmployeesPage },
  { path: '/activity', ...ActivityPage },
  { path: '/settings', ...SettingsPage }
];

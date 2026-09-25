/**
 * AfricaTravel — Route Definitions
 */

import { LoginPage } from '../pages/login.js';
import { DashboardPage } from '../pages/dashboard.js';
import { TicketsPage } from '../pages/tickets.js';
import { DueTicketsPage } from '../pages/due-tickets.js';
import { TicketCreatePage } from '../pages/ticket-create.js';
import { TicketDetailsPage } from '../pages/ticket-details.js';
import { ModificationDetailsPage } from '../pages/modification-details.js';
import { RefundDetailsPage } from '../pages/refund-details.js';
import { CustomersPage } from '../pages/customers.js';
import { CustomerDetailsPage } from '../pages/customer-details.js';
import { PaymentsPage } from '../pages/payments.js';
import { RefundsPage } from '../pages/refunds.js';
import { ReportsPage } from '../pages/reports.js';
import { ExpensesPage } from '../pages/expenses.js';
import { VisasPage } from '../pages/visas.js';
import { VisaDetailsPage } from '../pages/visa-details.js';
import { EmployeesPage } from '../pages/employees.js';
import { ActivityPage } from '../pages/activity.js';
import { SettingsPage } from '../pages/settings.js';

export const routes = [
  { path: '/login', ...LoginPage, isAuthOnly: true },
  { path: '/dashboard', ...DashboardPage },
  { path: '/tickets/new', ...TicketCreatePage },
  { path: '/tickets/:id/modifications/:modIndex', ...ModificationDetailsPage },
  { path: '/tickets/:id/refunds/:refundIndex', ...RefundDetailsPage },
  { path: '/tickets/:id/payments', ...TicketDetailsPage },
  { path: '/tickets/:id/modifications', ...TicketDetailsPage },
  { path: '/tickets/:id/refunds', ...TicketDetailsPage },
  { path: '/tickets/:id', ...TicketDetailsPage },
  { path: '/tickets', ...TicketsPage },
  { path: '/due-tickets', ...DueTicketsPage },
  { path: '/customers/:id', ...CustomerDetailsPage },
  { path: '/customers', ...CustomersPage },
  { path: '/visas/:id', ...VisaDetailsPage },
  { path: '/visas', ...VisasPage },
  { path: '/payments', ...PaymentsPage },
  { path: '/refunds', ...RefundsPage },
  { path: '/reports', ...ReportsPage },
  { path: '/expenses', ...ExpensesPage },
  { path: '/employees', ...EmployeesPage },
  { path: '/activity', ...ActivityPage },
  { path: '/settings', ...SettingsPage }
];

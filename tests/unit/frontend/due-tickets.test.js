/**
 * AfricaTravel — Due Tickets (تذاكر عليها متبقي) Unit & Integration Tests
 */

import assert from 'node:assert/strict';
import { test, describe, beforeEach, afterEach } from 'node:test';
import { TicketService } from '../../../frontend/js/services/ticket-service.js';
import { store } from '../../../frontend/js/state/store.js';
import { i18n } from '../../../frontend/js/i18n/i18n.js';
import { renderSidebar } from '../../../frontend/js/components/sidebar.js';
import { routes } from '../../../frontend/js/router/routes.js';
import { DueTicketsPage } from '../../../frontend/js/pages/due-tickets.js';

describe('Due Tickets (تذاكر عليها متبقي) Feature Suite', () => {
  let originalTickets;
  let originalLang;

  beforeEach(() => {
    originalTickets = [...store.getState().tickets];
    originalLang = i18n.getLanguage();
    i18n.setLanguage('ar');
  });

  afterEach(() => {
    store.state.tickets = originalTickets;
    i18n.setLanguage(originalLang);
  });

  const mockTickets = [
    {
      id: 'TKT-001',
      ticketNumber: '176-1001',
      pnr: 'ABC111',
      passengerName: 'أحمد محمود',
      phone: '+201011111111',
      airline: 'EgyptAir',
      airlineCode: 'MS',
      origin: 'CAI',
      destination: 'DXB',
      departureDate: '2026-10-01T10:00:00Z',
      ticketPrice: 10000,
      payments: [], // remaining: 10000
      status: 'UNPAID'
    },
    {
      id: 'TKT-002',
      ticketNumber: '176-1002',
      pnr: 'ABC222',
      passengerName: 'سارة إبراهيم',
      phone: '+201022222222',
      airline: 'Saudia',
      airlineCode: 'SV',
      origin: 'CAI',
      destination: 'JED',
      departureDate: '2026-10-05T14:00:00Z',
      ticketPrice: 15000,
      payments: [{ id: 'PAY-1', amount: 5000, type: 'TICKET' }], // remaining: 10000
      status: 'PARTIALLY PAID'
    },
    {
      id: 'TKT-003',
      ticketNumber: '176-1003',
      pnr: 'ABC333',
      passengerName: 'خالد توفيق',
      phone: '+201033333333',
      airline: 'Emirates',
      airlineCode: 'EK',
      origin: 'CAI',
      destination: 'DXB',
      departureDate: '2026-10-10T18:00:00Z',
      ticketPrice: 20000,
      payments: [{ id: 'PAY-2', amount: 20000, type: 'TICKET' }], // remaining: 0 (Fully Paid)
      status: 'CONFIRMED'
    },
    {
      id: 'TKT-004',
      ticketNumber: '176-1004',
      pnr: 'ABC444',
      passengerName: 'محمود زكي',
      phone: '+201044444444',
      airline: 'Qatar Airways',
      airlineCode: 'QR',
      origin: 'CAI',
      destination: 'DOH',
      departureDate: '2026-10-12T08:00:00Z',
      ticketPrice: 12000,
      payments: [], // Cancelled ticket
      status: 'CANCELLED'
    },
    {
      id: 'TKT-005',
      ticketNumber: '176-1005',
      pnr: 'ABC555',
      passengerName: 'منى خليل',
      phone: '+201055555555',
      airline: 'Flynas',
      airlineCode: 'XY',
      origin: 'CAI',
      destination: 'RUH',
      departureDate: '2026-10-15T12:00:00Z',
      ticketPrice: 8000,
      payments: [], // Refunded ticket
      status: 'REFUNDED'
    }
  ];

  test('TicketService.getDueTickets filters only tickets with remaining > 0 and active status', () => {
    store.state.tickets = [...mockTickets];

    const dueTickets = TicketService.getDueTickets();
    assert.strictEqual(dueTickets.length, 2, 'Should include exactly 2 tickets (TKT-001 and TKT-002)');
    assert.strictEqual(dueTickets[0].id, 'TKT-001');
    assert.strictEqual(dueTickets[1].id, 'TKT-002');

    // Confirmed, Cancelled, and Refunded must be excluded
    const ids = dueTickets.map(t => t.id);
    assert.ok(!ids.includes('TKT-003'), 'Fully paid confirmed ticket must be excluded');
    assert.ok(!ids.includes('TKT-004'), 'Cancelled ticket must be excluded');
    assert.ok(!ids.includes('TKT-005'), 'Refunded ticket must be excluded');
  });

  test('TicketService.getDueTicketsCount returns the accurate real-time count', () => {
    store.state.tickets = [...mockTickets];
    assert.strictEqual(TicketService.getDueTicketsCount(), 2);
  });

  test('TicketService.getDueTickets supports search by passenger name, phone, pnr, and ticketNumber', () => {
    store.state.tickets = [...mockTickets];

    // Search by name
    const byName = TicketService.getDueTickets({ search: 'أحمد' });
    assert.strictEqual(byName.length, 1);
    assert.strictEqual(byName[0].id, 'TKT-001');

    // Search by phone
    const byPhone = TicketService.getDueTickets({ search: '222222' });
    assert.strictEqual(byPhone.length, 1);
    assert.strictEqual(byPhone[0].id, 'TKT-002');

    // Search by PNR
    const byPnr = TicketService.getDueTickets({ search: 'ABC111' });
    assert.strictEqual(byPnr.length, 1);
    assert.strictEqual(byPnr[0].id, 'TKT-001');

    // Search by ticketNumber
    const byNumber = TicketService.getDueTickets({ search: '176-1002' });
    assert.strictEqual(byNumber.length, 1);
    assert.strictEqual(byNumber[0].id, 'TKT-002');
  });

  test('TicketService.getDueTickets supports filtering by status (UNPAID vs PARTIALLY PAID)', () => {
    store.state.tickets = [...mockTickets];

    const unpaid = TicketService.getDueTickets({ status: 'UNPAID' });
    assert.strictEqual(unpaid.length, 1);
    assert.strictEqual(unpaid[0].id, 'TKT-001');

    const partiallyPaid = TicketService.getDueTickets({ status: 'PARTIALLY PAID' });
    assert.strictEqual(partiallyPaid.length, 1);
    assert.strictEqual(partiallyPaid[0].id, 'TKT-002');
  });

  test('Automatic Transition: When a ticket is fully paid, it leaves due tickets but stays in all tickets', () => {
    store.state.tickets = JSON.parse(JSON.stringify(mockTickets));

    // Initially 2 due tickets
    assert.strictEqual(TicketService.getDueTickets().length, 2);

    // Simulate customer paying remaining balance on TKT-001
    const tkt1 = store.state.tickets.find(t => t.id === 'TKT-001');
    tkt1.payments.push({ id: 'PAY-3', amount: 10000, type: 'TICKET' });
    tkt1.status = 'CONFIRMED';

    // Now due tickets should only be 1 (TKT-002)
    const newDue = TicketService.getDueTickets();
    assert.strictEqual(newDue.length, 1);
    assert.strictEqual(newDue[0].id, 'TKT-002');

    // But TKT-001 is still preserved in all tickets!
    const all = TicketService.getAllTickets();
    assert.strictEqual(all.length, 5);
    const found = all.find(t => t.id === 'TKT-001');
    assert.ok(found, 'Ticket must remain in all tickets');
    assert.strictEqual(found.status, 'CONFIRMED');
  });

  test('Sidebar Navigation: renders /due-tickets link with badge count and localized label', () => {
    store.state.tickets = [...mockTickets];

    const sidebarHtml = renderSidebar('/due-tickets');

    // Check link exists
    assert.ok(sidebarHtml.includes('href="/due-tickets"'), 'Sidebar must include link to /due-tickets');

    // Check Arabic label
    assert.ok(sidebarHtml.includes('تذاكر عليها متبقي'), 'Sidebar must contain Arabic label "تذاكر عليها متبقي"');

    // Check badge count is rendered
    assert.ok(sidebarHtml.includes('class="nav-badge"'), 'Sidebar link must render nav-badge element');
    assert.ok(sidebarHtml.includes('>2<'), 'Badge must show count of 2');

    // Check active class on /due-tickets and NOT on /tickets
    assert.ok(sidebarHtml.includes('href="/due-tickets" class="nav-link active"'), '/due-tickets must be active');
    assert.ok(!sidebarHtml.includes('href="/tickets" class="nav-link active"'), '/tickets must NOT be active when on /due-tickets');
  });

  test('Router Configuration: /due-tickets route is registered', () => {
    const route = routes.find(r => r.path === '/due-tickets');
    assert.ok(route, '/due-tickets route must be registered in routes.js');
    assert.strictEqual(typeof route.render, 'function', 'Route must have render function');
    assert.strictEqual(typeof route.afterRender, 'function', 'Route must have afterRender function');
  });

  test('DueTicketsPage renders correctly with table and rows', () => {
    store.state.tickets = [...mockTickets];

    const html = DueTicketsPage.render();
    assert.ok(html.includes('تذاكر عليها متبقي'), 'Page must render title');
    assert.ok(html.includes('TKT-001'), 'Page must render TKT-001');
    assert.ok(html.includes('TKT-002'), 'Page must render TKT-002');
    assert.ok(!html.includes('TKT-003'), 'Page must NOT render confirmed TKT-003');
  });

  test('DueTicketsPage renders empty state when no tickets have money due', () => {
    store.state.tickets = [];

    const html = DueTicketsPage.render();
    assert.ok(html.includes('لا توجد تذاكر عليها متبقي') || html.includes('No Tickets with Balance Due'), 'Page must render empty state when 0 due tickets');
  });
});

/**
 * AfriciaTravel — Mobile Bottom Navigation & More Drawer Component
 */

import { icons } from './icons.js';

export function renderBottomNav(activePath = '/dashboard') {
  const isDashboard = activePath === '/dashboard';
  const isTickets = activePath.startsWith('/tickets');
  const isCustomers = activePath.startsWith('/customers');
  const isMoreActive = !isDashboard && !isTickets && !isCustomers;

  return `
    <nav class="app-bottom-nav">
      <a href="/dashboard" class="bottom-nav-item ${isDashboard ? 'active' : ''}" data-link>
        ${icons.dashboard()}
        <span>Dashboard</span>
      </a>

      <a href="/tickets" class="bottom-nav-item ${isTickets ? 'active' : ''}" data-link>
        ${icons.ticket()}
        <span>Tickets</span>
      </a>

      <a href="/customers" class="bottom-nav-item ${isCustomers ? 'active' : ''}" data-link>
        ${icons.customers()}
        <span>Customers</span>
      </a>

      <button type="button" class="bottom-nav-item ${isMoreActive ? 'active' : ''}" id="bottom-nav-more-trigger">
        ${icons.menu()}
        <span>More</span>
      </button>
    </nav>

    <div class="mobile-drawer-backdrop" id="mobile-more-backdrop"></div>
    <div class="mobile-drawer" id="mobile-more-drawer">
      <div class="mobile-drawer-handle"></div>
      <div class="drawer-nav-grid">
        <a href="/payments" class="drawer-nav-item" data-link>
          ${icons.payments()}
          <span>Payments</span>
        </a>
        <a href="/refunds" class="drawer-nav-item" data-link>
          ${icons.refunds()}
          <span>Refunds</span>
        </a>
        <a href="/reports" class="drawer-nav-item" data-link>
          ${icons.reports()}
          <span>Reports</span>
        </a>
        <a href="/employees" class="drawer-nav-item" data-link>
          ${icons.employees()}
          <span>Employees</span>
        </a>
        <a href="/activity" class="drawer-nav-item" data-link>
          ${icons.activity()}
          <span>Activity Log</span>
        </a>
        <a href="/settings" class="drawer-nav-item" data-link>
          ${icons.settings()}
          <span>Settings</span>
        </a>
      </div>
    </div>
  `;
}

export function bindBottomNavEvents(container, onNavigate) {
  const moreTrigger = container.querySelector('#bottom-nav-more-trigger');
  const backdrop = container.querySelector('#mobile-more-backdrop');
  const drawer = container.querySelector('#mobile-more-drawer');

  if (!moreTrigger || !backdrop || !drawer) return;

  const openDrawer = () => {
    backdrop.classList.add('open');
    drawer.classList.add('open');
  };

  const closeDrawer = () => {
    backdrop.classList.remove('open');
    drawer.classList.remove('open');
  };

  moreTrigger.addEventListener('click', (e) => {
    e.preventDefault();
    if (drawer.classList.contains('open')) {
      closeDrawer();
    } else {
      openDrawer();
    }
  });

  backdrop.addEventListener('click', closeDrawer);

  drawer.querySelectorAll('.drawer-nav-item').forEach(item => {
    item.addEventListener('click', () => {
      closeDrawer();
    });
  });
}

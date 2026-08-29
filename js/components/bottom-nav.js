/**
 * AfricaTravel - Mobile Bottom Navigation & More Drawer Component
 */

import { icons } from './icons.js';
import { AuthService } from '../services/auth-service.js';
import { t } from '../i18n/i18n.js';
import { escapeHtml } from '../utils/security.js';

export function renderBottomNav(activePath = '/dashboard') {
  const currentUser = AuthService.getCurrentUser() || {};
  const isAdmin = (currentUser.role || '').toUpperCase() === 'ADMIN';
  const isTicketOnly = (currentUser.role || '').toUpperCase() === 'TICKET_ONLY';

  if (isTicketOnly) {
    const isCreateTicket = activePath === '/tickets/new' || activePath === '/tickets/create';
    return `
      <nav class="app-bottom-nav" aria-label="${escapeHtml(t('nav.newTicket'))}">
        <a href="/tickets/new" class="bottom-nav-item ${isCreateTicket ? 'active' : ''}" data-link>
          ${icons.plus()}
          <span>${escapeHtml(t('nav.newTicket'))}</span>
        </a>
      </nav>`;
  }

  const isDashboard = activePath === '/dashboard';
  const isTickets = activePath.startsWith('/tickets');
  const isCustomers = activePath.startsWith('/customers');
  const isMoreActive = !isDashboard && !isTickets && !isCustomers;

  return `
    <nav class="app-bottom-nav" aria-label="${escapeHtml(t('nav.more'))}">
      <a href="/dashboard" class="bottom-nav-item ${isDashboard ? 'active' : ''}" data-link>
        ${icons.dashboard()}
        <span>${escapeHtml(t('nav.dashboard'))}</span>
      </a>

      <a href="/tickets" class="bottom-nav-item ${isTickets ? 'active' : ''}" data-link>
        ${icons.ticket()}
        <span>${escapeHtml(t('nav.tickets'))}</span>
      </a>

      <a href="/customers" class="bottom-nav-item ${isCustomers ? 'active' : ''}" data-link>
        ${icons.customers()}
        <span>${escapeHtml(t('nav.customers'))}</span>
      </a>

      <button type="button" class="bottom-nav-item ${isMoreActive ? 'active' : ''}" id="bottom-nav-more-trigger" aria-label="${escapeHtml(t('nav.more'))}" aria-haspopup="dialog" aria-expanded="false">
        ${icons.menu()}
        <span>${escapeHtml(t('nav.more'))}</span>
      </button>
    </nav>

    <div class="mobile-drawer-backdrop" id="mobile-more-backdrop"></div>
    <div class="mobile-drawer" id="mobile-more-drawer" role="dialog" aria-modal="true" aria-label="${escapeHtml(t('nav.more'))}">
      <div class="drawer-nav-grid">
        <a href="/payments" class="drawer-nav-item" data-link>
          ${icons.payments()}
          <span>${escapeHtml(t('nav.payments'))}</span>
        </a>
        <a href="/refunds" class="drawer-nav-item" data-link>
          ${icons.refunds()}
          <span>${escapeHtml(t('nav.refunds'))}</span>
        </a>
        <a href="/reports" class="drawer-nav-item" data-link>
          ${icons.reports()}
          <span>${escapeHtml(t('nav.reports'))}</span>
        </a>
        <a href="/expenses" class="drawer-nav-item" data-link>
          ${icons.expenses()}
          <span>${escapeHtml(t('nav.expenses'))}</span>
        </a>
        ${isAdmin ? `
        <a href="/employees" class="drawer-nav-item" data-link>
          ${icons.employees()}
          <span>${escapeHtml(t('nav.employees'))}</span>
        </a>
        ` : ''}
        <a href="/activity" class="drawer-nav-item" data-link>
          ${icons.activity()}
          <span>${escapeHtml(t('nav.activity'))}</span>
        </a>
        <a href="/settings" class="drawer-nav-item" data-link>
          ${icons.settings()}
          <span>${escapeHtml(t('nav.settings'))}</span>
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
    moreTrigger.setAttribute('aria-expanded', 'true');
  };

  const closeDrawer = () => {
    backdrop.classList.remove('open');
    drawer.classList.remove('open');
    moreTrigger.setAttribute('aria-expanded', 'false');
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

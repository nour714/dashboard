/**
 * AfricaTravel — Main Application Entry Point
 */

import { store } from './state/store.js';
import { AuthService } from './services/auth-service.js';
import { routes } from './router/routes.js';
import { Router } from './router/router.js';
import { renderSidebar } from './components/sidebar.js';
import { renderTopbar } from './components/topbar.js';
import { renderBottomNav, bindBottomNavEvents } from './components/bottom-nav.js';
import { openModal, closeModal } from './components/modal.js';
import { createElement, clearElement, appendChildren } from './utils/dom.js';
import { escapeHtml } from './utils/security.js';

class App {
  constructor() {
    this.appContainer = document.getElementById('app');
    this.router = null;
    this.shellRendered = false;
    this.init();
  }

  init() {
    // Listen to route changes
    window.addEventListener('AfricaTravel:route-changed', (e) => {
      const { path } = e.detail;
      this.handleRouteChange(path);
    });

    // Subscribe to store updates for header badge sync and auth state transitions
    store.subscribe((state) => {
      if (!state.isAuthenticated && this.shellRendered) {
        this.setupShellForCurrentPath();
      } else if (state.isAuthenticated) {
        this.updateHeaderProfile();
      }
    });

    // Setup Shell or Login based on current path
    this.setupShellForCurrentPath();
  }

  setupShellForCurrentPath() {
    const pathname = window.location.pathname;
    const isAuthenticated = AuthService.isAuthenticated();

    if (pathname === '/login' || (!isAuthenticated && pathname !== '/login')) {
      this.shellRendered = false;
      this.appContainer.innerHTML = '<div id="app-page-mount"></div>';
      const mount = document.getElementById('app-page-mount');
      this.router = new Router(routes, mount);
      return;
    }

    // Render Full App Shell
    this.renderAppShell(pathname);
    const contentMount = document.getElementById('app-content-mount');
    this.router = new Router(routes, contentMount);
  }

  renderAppShell(activePath = '/dashboard') {
    this.appContainer.innerHTML = `
      <div class="app-shell">
        <!-- Sidebar -->
        <div id="app-sidebar-container">
          ${renderSidebar(activePath)}
        </div>

        <!-- Main Workspace -->
        <div class="app-main-wrap">
          <div id="app-topbar-container">
            ${renderTopbar()}
          </div>

          <main class="app-content" id="app-content-mount" tabindex="-1">
            <!-- Dynamic Page Content -->
          </main>
        </div>

        <!-- Mobile Navigation -->
        <div id="app-bottom-nav-container">
          ${renderBottomNav(activePath)}
        </div>
      </div>
    `;

    this.shellRendered = true;
    this.bindGlobalEvents();
  }

  handleRouteChange(path) {
    if (path === '/login') {
      if (this.shellRendered) {
        this.setupShellForCurrentPath();
      }
      return;
    }

    if (!this.shellRendered) {
      this.renderAppShell(path);
      this.router.mountElement = document.getElementById('app-content-mount');
      this.router.resolveCurrentRoute();
      return;
    }

    // Update active nav links in sidebar
    const sidebarContainer = document.getElementById('app-sidebar-container');
    if (sidebarContainer) {
      sidebarContainer.innerHTML = renderSidebar(path);
    }

    // Update active nav links in mobile bottom nav
    const bottomNavContainer = document.getElementById('app-bottom-nav-container');
    if (bottomNavContainer) {
      bottomNavContainer.innerHTML = renderBottomNav(path);
      bindBottomNavEvents(bottomNavContainer);
    }
  }

  bindGlobalEvents() {
    // Global Search Form with Safe DOM Live Suggestions
    const searchForm = document.getElementById('topbar-global-search');
    const searchInput = document.getElementById('global-search-input');
    const searchDropdown = document.getElementById('topbar-search-dropdown');

    if (searchForm && searchInput) {
      const renderSuggestions = (query) => {
        if (!searchDropdown) return;
        const q = (query || '').toLowerCase().trim();
        if (!q) {
          searchDropdown.classList.add('d-none');
          clearElement(searchDropdown);
          return;
        }

        const { tickets = [], customers = [] } = store.getState();
        const matchedTickets = tickets.filter(t =>
          (t.id && t.id.toLowerCase().includes(q)) ||
          (t.pnr && t.pnr.toLowerCase().includes(q)) ||
          (t.ticketNumber && t.ticketNumber.toLowerCase().includes(q)) ||
          (t.passengerName && t.passengerName.toLowerCase().includes(q)) ||
          (t.phone && t.phone.toLowerCase().includes(q))
        ).slice(0, 4);

        const matchedCustomers = customers.filter(c =>
          (c.name && c.name.toLowerCase().includes(q)) ||
          (c.email && c.email.toLowerCase().includes(q)) ||
          (c.phone && c.phone.toLowerCase().includes(q)) ||
          (c.passport && c.passport.toLowerCase().includes(q)) ||
          (c.id && c.id.toLowerCase().includes(q))
        ).slice(0, 3);

        clearElement(searchDropdown);

        if (matchedTickets.length === 0 && matchedCustomers.length === 0) {
          const emptyItem = createElement('div', { className: 'p-md text-center text-muted text-sm' });
          emptyItem.appendChild(document.createTextNode('No results found for "'));
          const queryTextNode = createElement('strong', {}, query);
          emptyItem.appendChild(queryTextNode);
          emptyItem.appendChild(document.createTextNode('"'));
          searchDropdown.appendChild(emptyItem);
          searchDropdown.classList.remove('d-none');
          return;
        }

        // Safe DOM building for Tickets
        if (matchedTickets.length > 0) {
          const ticketHeader = createElement('div', { className: 'search-dropdown-header' }, 'Tickets & Reservations');
          searchDropdown.appendChild(ticketHeader);

          matchedTickets.forEach(t => {
            const item = createElement('a', {
              href: `/tickets/${t.id}`,
              className: 'search-dropdown-item',
              'data-link': ''
            });

            const leftCol = createElement('div');
            const nameEl = createElement('div', { className: 'font-semibold', style: 'font-size: 14px;' }, t.passengerName);
            const metaEl = createElement('div', { className: 'text-xs text-muted' });

            metaEl.appendChild(document.createTextNode(`${t.id} • PNR: `));
            const pnrStrong = createElement('strong', { style: 'color: var(--color-primary);' }, t.pnr);
            metaEl.appendChild(pnrStrong);
            metaEl.appendChild(document.createTextNode(` • ${t.origin || ''} ✈ ${t.destination || ''}`));

            leftCol.appendChild(nameEl);
            leftCol.appendChild(metaEl);

            const badgeClass = t.status === 'CONFIRMED' || t.status === 'PAID' ? 'badge-confirmed' : 'badge-partially-paid';
            const badgeEl = createElement('span', { className: `badge ${badgeClass}` }, t.status);

            item.appendChild(leftCol);
            item.appendChild(badgeEl);
            searchDropdown.appendChild(item);
          });
        }

        // Safe DOM building for Customers
        if (matchedCustomers.length > 0) {
          const custHeader = createElement('div', { className: 'search-dropdown-header' }, 'Customers');
          searchDropdown.appendChild(custHeader);

          matchedCustomers.forEach(c => {
            const item = createElement('a', {
              href: `/customers/${c.id}`,
              className: 'search-dropdown-item',
              'data-link': ''
            });

            const leftCol = createElement('div');
            const nameRow = createElement('div', { className: 'font-semibold', style: 'font-size: 14px;' });
            nameRow.appendChild(document.createTextNode(c.name || 'Customer'));

            if (c.isVip) {
              const vipBadge = createElement('span', { className: 'badge badge-vip ml-xs' }, 'VIP');
              nameRow.appendChild(vipBadge);
            }

            const metaEl = createElement('div', { className: 'text-xs text-muted' }, c.email || c.phone || c.id);

            leftCol.appendChild(nameRow);
            leftCol.appendChild(metaEl);

            const actionSpan = createElement('span', { className: 'text-xs text-accent font-semibold' }, 'Profile ›');

            item.appendChild(leftCol);
            item.appendChild(actionSpan);
            searchDropdown.appendChild(item);
          });
        }

        searchDropdown.classList.remove('d-none');
      };

      searchInput.addEventListener('input', (e) => {
        renderSuggestions(e.target.value);
      });

      searchInput.addEventListener('focus', (e) => {
        if (e.target.value.trim()) {
          renderSuggestions(e.target.value);
        }
      });

      // Close dropdown when clicking outside
      document.addEventListener('click', (e) => {
        if (!searchForm.contains(e.target) && searchDropdown) {
          searchDropdown.classList.add('d-none');
        }
      });

      searchForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const query = searchInput.value.trim();
        if (searchDropdown) searchDropdown.classList.add('d-none');
        if (query) {
          const { tickets } = store.getState();
          const exact = tickets.find(t => t.id.toLowerCase() === query.toLowerCase() || t.pnr.toLowerCase() === query.toLowerCase());
          if (exact) {
            this.router.navigateTo(`/tickets/${exact.id}`);
          } else {
            this.router.navigateTo(`/tickets?q=${encodeURIComponent(query)}`);
          }
          searchInput.value = '';
        }
      });
    }

    // Notification Bell
    const notifBtn = document.getElementById('topbar-notif-btn');
    if (notifBtn) {
      notifBtn.addEventListener('click', () => {
        const { activityLogs } = store.getState();
        const recent = activityLogs.slice(0, 4);

        openModal({
          title: 'Notifications & Alerts',
          subtitle: 'Recent system operations and ticketing updates',
          maxWidth: '480px',
          contentHtml: `
            <div class="d-flex flex-column gap-sm">
              ${recent.map(r => `
                <div class="p-sm" style="background-color: var(--color-surface); border-radius: var(--radius-md); border: 1px solid var(--color-border-soft);">
                  <div class="d-flex justify-between text-xs text-muted mb-xxs">
                    <strong>${escapeHtml(r.user)}</strong>
                    <span>${new Date(r.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <div class="text-sm font-medium">${escapeHtml(r.description)}</div>
                </div>
              `).join('')}
            </div>
          `,
          footerHtml: `
            <a href="/activity" class="btn btn-sm btn-primary" id="view-all-audit-btn" data-link>View Full Audit Trail</a>
          `,
          onOpen: (modalEl) => {
            const link = modalEl.querySelector('#view-all-audit-btn');
            if (link) {
              link.addEventListener('click', () => closeModal());
            }
          }
        });
      });
    }

    // Help Button
    const helpBtn = document.getElementById('topbar-help-btn');
    if (helpBtn) {
      helpBtn.addEventListener('click', () => {
        openModal({
          title: 'AfricaTravel Operational Guide',
          subtitle: 'System shortcuts and operational documentation',
          contentHtml: `
            <div class="d-flex flex-column gap-md text-sm">
              <div>
                <h4 style="margin-bottom: 6px;">Key Operations Workflows</h4>
                <ul style="padding-left: 20px; color: var(--color-text-secondary); line-height: 1.6;">
                  <li><strong>Issue Ticket:</strong> Go to <code>/tickets/new</code>, fill customer, itinerary, and financial amounts. Remaining balance is automatically computed.</li>
                  <li><strong>Record Payment:</strong> In ticket details, click <strong>+ Add Payment</strong>. Payments are append-only and balance-validated.</li>
                  <li><strong>Schedule Modification:</strong> In ticket details, click <strong>Modify Flight</strong>. Previous flights are archived in history.</li>
                  <li><strong>Process Refund:</strong> Available refundable balances are strictly validated.</li>
                </ul>
              </div>
              <div class="p-sm" style="background-color: var(--color-surface); border-radius: var(--radius-md);">
                <strong>Technical Support</strong>
                <p class="text-xs text-muted" style="margin-top: 4px;">Internal Travel Agency Operations Terminal v1.0.0 (Hardened Baseline)</p>
              </div>
            </div>
          `,
          footerHtml: `
            <button type="button" class="btn btn-secondary" onclick="document.querySelector('#modal-close-trigger')?.click()">Close</button>
          `
        });
      });
    }

    // Bind bottom nav drawer toggle
    const bottomNavContainer = document.getElementById('app-bottom-nav-container');
    if (bottomNavContainer) {
      bindBottomNavEvents(bottomNavContainer);
    }
  }

  updateHeaderProfile() {
    const currentUser = AuthService.getCurrentUser();
    if (!currentUser) return;
    const nameEl = document.querySelector('.topbar-user-name');
    const roleEl = document.querySelector('.topbar-user-role');
    if (nameEl) nameEl.textContent = currentUser.name || currentUser.fullName || 'Ahmed Hassan';
    if (roleEl) roleEl.textContent = currentUser.title || currentUser.role || 'Senior Operations Director';
  }
}

// Start application safely on DOM ready or immediately if already loaded
function bootstrap() {
  if (!window.AfricaTravel) {
    window.AfricaTravel = new App();
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootstrap);
} else {
  bootstrap();
}

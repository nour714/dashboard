/**
 * AfriciaTravel — Main Application Entry Point
 */

import { store } from './state/store.js';
import { routes } from './router/routes.js';
import { Router } from './router/router.js';
import { renderSidebar } from './components/sidebar.js';
import { renderTopbar } from './components/topbar.js';
import { renderBottomNav, bindBottomNavEvents } from './components/bottom-nav.js';
import { openModal, closeModal } from './components/modal.js';
import { showToast } from './components/toast.js';

class App {
  constructor() {
    this.appContainer = document.getElementById('app');
    this.router = null;
    this.shellRendered = false;
    this.init();
  }

  init() {
    // Listen to route changes — must be before router construction
    window.addEventListener('africiatravel:route-changed', (e) => {
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
    const { isAuthenticated } = store.getState();

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
    // Global Search Form with Live Suggestions
    const searchForm = document.getElementById('topbar-global-search');
    const searchInput = document.getElementById('global-search-input');
    const searchDropdown = document.getElementById('topbar-search-dropdown');

    if (searchForm && searchInput) {
      const renderSuggestions = (query) => {
        if (!searchDropdown) return;
        const q = query.toLowerCase().trim();
        if (!q) {
          searchDropdown.classList.add('d-none');
          searchDropdown.innerHTML = '';
          return;
        }

        const { tickets, customers } = store.getState();
        const matchedTickets = tickets.filter(t =>
          t.id.toLowerCase().includes(q) ||
          t.pnr.toLowerCase().includes(q) ||
          t.ticketNumber.toLowerCase().includes(q) ||
          t.passengerName.toLowerCase().includes(q)
        ).slice(0, 4);

        const matchedCustomers = customers.filter(c =>
          c.name.toLowerCase().includes(q) ||
          c.email.toLowerCase().includes(q) ||
          c.phone.toLowerCase().includes(q) ||
          c.id.toLowerCase().includes(q)
        ).slice(0, 3);

        if (matchedTickets.length === 0 && matchedCustomers.length === 0) {
          searchDropdown.innerHTML = `
            <div class="p-md text-center text-muted text-sm">
              No results found for "<strong>${query}</strong>"
            </div>
          `;
          searchDropdown.classList.remove('d-none');
          return;
        }

        let html = '';
        if (matchedTickets.length > 0) {
          html += `<div class="search-dropdown-header">Tickets & Reservations</div>`;
          matchedTickets.forEach(t => {
            html += `
              <a href="/tickets/${t.id}" class="search-dropdown-item" data-link>
                <div>
                  <div class="font-semibold" style="font-size: 14px;">${t.passengerName}</div>
                  <div class="text-xs text-muted">${t.id} • PNR: <strong style="color: var(--color-primary);">${t.pnr}</strong> • ${t.origin} ✈ ${t.destination}</div>
                </div>
                <span class="badge ${t.status === 'CONFIRMED' || t.status === 'PAID' ? 'badge-confirmed' : 'badge-partially-paid'}">${t.status}</span>
              </a>
            `;
          });
        }

        if (matchedCustomers.length > 0) {
          html += `<div class="search-dropdown-header">Customers</div>`;
          matchedCustomers.forEach(c => {
            html += `
              <a href="/customers/${c.id}" class="search-dropdown-item" data-link>
                <div>
                  <div class="font-semibold" style="font-size: 14px;">${c.name} ${c.isVip ? '<span class="badge badge-vip ml-xs">VIP</span>' : ''}</div>
                  <div class="text-xs text-muted">${c.email || c.phone || c.id}</div>
                </div>
                <span class="text-xs text-accent font-semibold">Profile ›</span>
              </a>
            `;
          });
        }

        searchDropdown.innerHTML = html;
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
          // If exact match with a ticket ID or PNR
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
                    <strong>${r.user}</strong>
                    <span>${new Date(r.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <div class="text-sm font-medium">${r.description}</div>
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
          title: 'AfriciaTravel Operational Guide',
          subtitle: 'System shortcuts and operational documentation',
          contentHtml: `
            <div class="d-flex flex-column gap-md text-sm">
              <div>
                <h4 style="margin-bottom: 6px;">Key Operations Workflows</h4>
                <ul style="padding-left: 20px; color: var(--color-text-secondary); line-height: 1.6;">
                  <li><strong>Issue Ticket:</strong> Go to <code>/tickets/new</code>, fill customer, itinerary, and financial amounts. Remaining balance is automatically computed.</li>
                  <li><strong>Record Payment:</strong> In ticket details, click <strong>+ Add Payment</strong>. Payments are append-only.</li>
                  <li><strong>Schedule Modification:</strong> In ticket details, click <strong>Modify Flight</strong>. Previous flights are archived in history.</li>
                  <li><strong>Process Refund:</strong> Available refundable balances are strictly validated.</li>
                </ul>
              </div>
              <div class="p-sm" style="background-color: var(--color-surface); border-radius: var(--radius-md);">
                <strong>Technical Support</strong>
                <p class="text-xs text-muted" style="margin-top: 4px;">Internal Travel Agency Operations Terminal v1.0.0 (Production Build)</p>
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
    const { currentUser } = store.getState();
    if (!currentUser) return;
    const nameEl = document.querySelector('.topbar-user-name');
    const roleEl = document.querySelector('.topbar-user-role');
    if (nameEl) nameEl.textContent = currentUser.name || currentUser.fullName || 'Ahmed Hassan';
    if (roleEl) roleEl.textContent = currentUser.title || currentUser.role || 'Senior Operations Director';
  }
}

// Start application on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  window.AfriciaTravel = new App();
});

/**
 * AfricaTravel — Main Application Entry Point
 */

import { store } from './state/store.js';
import { AuthService } from './services/auth-service.js';
import { refreshAccessToken } from './services/api-client.js';
import { routes } from './router/routes.js';
import { Router } from './router/router.js';
import { renderSidebar } from './components/sidebar.js';
import { renderTopbar } from './components/topbar.js';
import { renderBottomNav, bindBottomNavEvents } from './components/bottom-nav.js';
import { openModal, closeModal } from './components/modal.js';
import { showToast } from './components/toast.js';
import { createElement, clearElement, appendChildren } from './utils/dom.js';
import { escapeHtml } from './utils/security.js';
import { getUpcomingFlightReminders } from './utils/flight-reminders.js';
import { i18n, t, getUserRoleLabel } from './i18n/i18n.js';

function markBootStep(id, state) {
  const el = document.getElementById(id);
  if (el) {
    el.classList.remove('active', 'done');
    el.classList.add(state);
  }
}

function setBootProgress(pct, statusText, subText) {
  const bar = document.getElementById('boot-splash-progress-bar');
  if (bar) bar.style.width = `${pct}%`;
  const pctEl = document.getElementById('boot-splash-percentage');
  if (pctEl) pctEl.textContent = `${pct}%`;
  const status = document.getElementById('boot-splash-status');
  if (status && statusText) status.textContent = statusText;
  const substatus = document.getElementById('boot-splash-substatus');
  if (substatus && subText) substatus.textContent = subText;
}

function localizeBootSplash() {
  const curLang = i18n.getLanguage();
  const isAr = curLang === 'ar';

  const taglineEl = document.getElementById('boot-splash-tagline');
  if (taglineEl) taglineEl.textContent = t('bootSplash.systemTagline') || 'TRAVEL & TOURISM MANAGEMENT SYSTEM';

  const statusEl = document.getElementById('boot-splash-status');
  if (statusEl) statusEl.textContent = t('bootSplash.systemPreparing') || 'جاري تجهيز النظام...';

  const substatusEl = document.getElementById('boot-splash-substatus');
  if (substatusEl) substatusEl.textContent = t('bootSplash.systemWait') || 'يرجي الانتظار لحظة';

  const stepSessionTitle = document.getElementById('boot-step-session-title');
  const stepSessionSub = document.getElementById('boot-step-session-sub');
  if (stepSessionTitle) stepSessionTitle.textContent = isAr ? 'جاري التحقق من الجلسة' : 'Checking Session';
  if (stepSessionSub) stepSessionSub.textContent = isAr ? 'Checking session' : 'جاري التحقق من الجلسة';

  const stepUserTitle = document.getElementById('boot-step-user-title');
  const stepUserSub = document.getElementById('boot-step-user-sub');
  if (stepUserTitle) stepUserTitle.textContent = isAr ? 'جاري تحميل بيانات المستخدم' : 'Loading User Data';
  if (stepUserSub) stepUserSub.textContent = isAr ? 'Loading user data' : 'جاري تحميل بيانات المستخدم';

  const stepDataTitle = document.getElementById('boot-step-data-title');
  const stepDataSub = document.getElementById('boot-step-data-sub');
  if (stepDataTitle) stepDataTitle.textContent = isAr ? 'جاري تحميل بيانات النظام' : 'Loading System Data';
  if (stepDataSub) stepDataSub.textContent = isAr ? 'Loading system data' : 'جاري تحميل بيانات النظام';

  const stepShellTitle = document.getElementById('boot-step-shell-title');
  const stepShellSub = document.getElementById('boot-step-shell-sub');
  if (stepShellTitle) stepShellTitle.textContent = isAr ? 'جاري تجهيز لوحة التحكم' : 'Preparing Dashboard';
  if (stepShellSub) stepShellSub.textContent = isAr ? 'Preparing dashboard' : 'جاري تجهيز لوحة التحكم';

  const secureTitle = document.getElementById('boot-splash-secure-title');
  const secureSub = document.getElementById('boot-splash-secure-sub');
  if (secureTitle) secureTitle.textContent = isAr ? 'نظام آمن ومشفّر' : 'Secure & Encrypted';
  if (secureSub) secureSub.textContent = isAr ? 'SECURE & ENCRYPTED' : 'نظام آمن ومشفّر';
}

class App {
  constructor() {
    this.appContainer = document.getElementById('app');
    this.router = null;
    this.shellRendered = false;
    this.init();
  }

  init() {
    // Apply document attributes on start
    i18n.applyDocumentAttributes();

    // Listen to route changes
    window.addEventListener('AfricaTravel:route-changed', (e) => {
      const { path } = e.detail;
      this.handleRouteChange(path);
    });

    // Listen to language changes
    window.addEventListener('AfricaTravel:language-changed', () => {
      const currentPath = window.location.pathname;
      if (this.shellRendered) {
        this.renderAppShell(currentPath);
        this.router.mountElement = document.getElementById('app-content-mount');
        this.router.resolveCurrentRoute();
      } else {
        this.setupShellForCurrentPath();
      }
    });

    // Subscribe to store updates for header badge sync and auth state transitions
    store.subscribe((state) => {
      if (!state.isAuthenticated && this.shellRendered) {
        this.setupShellForCurrentPath();
      } else if (state.isAuthenticated) {
        this.updateHeaderProfile();
        this.updateTopbarBadges();
      }
    });

    // Setup Shell or Login based on current path
    this.setupShellForCurrentPath();
  }

  async setupShellForCurrentPath() {
    const pathname = window.location.pathname;
    const isAuthenticated = AuthService.isAuthenticated();

    if (pathname === '/login' || (!isAuthenticated && pathname !== '/login')) {
      this.shellRendered = false;
      this.appContainer.innerHTML = '<div id="app-page-mount"></div>';
      const mount = document.getElementById('app-page-mount');
      if (this.router) {
        this.router.destroy();
      }
      this.router = new Router(routes, mount);
      return;
    }

    localizeBootSplash();

    // Step 1: Session check
    markBootStep('boot-step-session', 'active');
    setBootProgress(25, t('bootSplash.systemPreparing') || 'جاري تجهيز النظام...', t('bootSplash.systemWait') || 'يرجي الانتظار لحظة');
    try {
      await refreshAccessToken();
    } catch (e) {
      // If refresh fails (e.g. invalid/expired refresh token cookie),
      // let ensureHydrated() handle it gracefully as it currently does.
    }
    markBootStep('boot-step-session', 'done');

    // Step 2: User profile & authentication check
    markBootStep('boot-step-user', 'active');
    setBootProgress(50, t('bootSplash.systemPreparing') || 'جاري تجهيز النظام...', t('bootSplash.systemWait') || 'يرجي الانتظار لحظة');
    try {
      AuthService.getCurrentUser();
    } catch (e) {}
    markBootStep('boot-step-user', 'done');

    // Step 3: System Data Hydration
    markBootStep('boot-step-data', 'active');
    setBootProgress(75, t('bootSplash.systemPreparing') || 'جاري تجهيز النظام...', t('bootSplash.systemWait') || 'يرجي الانتظار لحظة');
    try {
      await store.ensureHydrated();
    } catch (e) {
      console.error('Failed to hydrate application state from backend', e);
    }
    markBootStep('boot-step-data', 'done');

    // Step 4: Dashboard Shell Preparation
    markBootStep('boot-step-shell', 'active');
    setBootProgress(100, t('bootSplash.systemPreparing') || 'جاري تجهيز النظام...', t('bootSplash.systemWait') || 'يرجي الانتظار لحظة');

    // Render Full App Shell
    this.renderAppShell(pathname);
    const contentMount = document.getElementById('app-content-mount');
    if (this.router) {
      this.router.destroy();
    }
    this.router = new Router(routes, contentMount);
  }

  renderAppShell(activePath = '/dashboard') {
    const upcomingCount = getUpcomingFlightReminders(store.getState().tickets || []).length;
    this.appContainer.innerHTML = `
      <div class="app-shell">
        <!-- Sidebar -->
        <div id="app-sidebar-container">
          ${renderSidebar(activePath)}
        </div>

        <!-- Main Workspace -->
        <div class="app-main-wrap">
          <div id="app-topbar-container">
            ${renderTopbar(upcomingCount)}
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
    // Language Switcher in Topbar
    const langToggleBtn = document.getElementById('topbar-lang-toggle-btn');
    if (langToggleBtn) {
      langToggleBtn.addEventListener('click', () => {
        i18n.toggleLanguage();
      });
    }

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
        const matchedTickets = tickets.filter(tData =>
          (tData.id && tData.id.toLowerCase().includes(q)) ||
          (tData.pnr && tData.pnr.toLowerCase().includes(q)) ||
          (tData.ticketNumber && tData.ticketNumber.toLowerCase().includes(q)) ||
          (tData.passengerName && tData.passengerName.toLowerCase().includes(q)) ||
          (tData.phone && tData.phone.toLowerCase().includes(q))
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
          emptyItem.appendChild(document.createTextNode(t('common.noData') + ' "'));
          const queryTextNode = createElement('strong', {}, query);
          emptyItem.appendChild(queryTextNode);
          emptyItem.appendChild(document.createTextNode('"'));
          searchDropdown.appendChild(emptyItem);
          searchDropdown.classList.remove('d-none');
          return;
        }

        // Safe DOM building for Tickets
        if (matchedTickets.length > 0) {
          const ticketHeader = createElement('div', { className: 'search-dropdown-header' }, t('nav.tickets'));
          searchDropdown.appendChild(ticketHeader);

          matchedTickets.forEach(tData => {
            const item = createElement('a', {
              href: `/tickets/${tData.id}`,
              className: 'search-dropdown-item',
              'data-link': ''
            });

            const leftCol = createElement('div');
            const nameEl = createElement('div', { className: 'font-semibold', style: 'font-size: 14px;' }, tData.passengerName);
            const metaEl = createElement('div', { className: 'text-xs text-muted' });

            metaEl.appendChild(document.createTextNode(`${tData.id} • PNR: `));
            const pnrStrong = createElement('strong', { style: 'color: var(--color-primary);' }, tData.pnr);
            metaEl.appendChild(pnrStrong);
            metaEl.appendChild(document.createTextNode(` • ${tData.origin || ''} ✈ ${tData.destination || ''}`));

            leftCol.appendChild(nameEl);
            leftCol.appendChild(metaEl);

            const badgeClass = tData.status === 'CONFIRMED' || tData.status === 'PAID'
              ? 'badge-confirmed'
              : (tData.status === 'PARTIALLY PAID' ? 'badge-partially-paid' : 'badge-neutral');
            const badgeEl = createElement('span', { className: `badge ${badgeClass}` }, i18n.translateStatus(tData.status));

            item.appendChild(leftCol);
            item.appendChild(badgeEl);
            searchDropdown.appendChild(item);
          });
        }

        // Safe DOM building for Customers
        if (matchedCustomers.length > 0) {
          const custHeader = createElement('div', { className: 'search-dropdown-header' }, t('nav.customers'));
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
              const vipBadge = createElement('span', { className: 'badge badge-vip ms-xs' }, 'VIP');
              nameRow.appendChild(vipBadge);
            }

            const metaEl = createElement('div', { className: 'text-xs text-muted ltr-data' }, c.email || c.phone || c.id);

            leftCol.appendChild(nameRow);
            leftCol.appendChild(metaEl);

            const actionSpan = createElement('span', { className: 'text-xs text-accent font-semibold' }, `${t('common.details')} ›`);

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

      // Mobile search overlay controls
      const mobileSearchBtn = document.getElementById('topbar-mobile-search-btn');
      const searchCloseBtn = document.getElementById('topbar-search-close-btn');
      const topbarEl = document.querySelector('.app-topbar');

      const closeMobileSearch = () => {
        if (searchForm) searchForm.classList.remove('mobile-search-active');
        if (topbarEl) topbarEl.classList.remove('mobile-search-open');
        if (searchInput) searchInput.value = '';
        if (searchDropdown) {
          searchDropdown.classList.add('d-none');
          clearElement(searchDropdown);
        }
      };

      if (mobileSearchBtn && searchForm && topbarEl) {
        mobileSearchBtn.addEventListener('click', () => {
          searchForm.classList.add('mobile-search-active');
          topbarEl.classList.add('mobile-search-open');
          searchInput?.focus();
        });
      }

      if (searchCloseBtn) {
        searchCloseBtn.addEventListener('click', () => {
          closeMobileSearch();
        });
      }

      if (searchDropdown) {
        searchDropdown.addEventListener('click', (e) => {
          if (e.target.closest('.search-dropdown-item')) {
            closeMobileSearch();
          }
        });
      }

      searchForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const query = searchInput.value.trim();
        if (query) {
          const { tickets } = store.getState();
          const exact = tickets.find(tData => tData.id.toLowerCase() === query.toLowerCase() || tData.pnr.toLowerCase() === query.toLowerCase());
          if (exact) {
            this.router.navigateTo(`/tickets/${exact.id}`);
          } else {
            this.router.navigateTo(`/tickets?q=${encodeURIComponent(query)}`);
          }
          closeMobileSearch();
        } else {
          if (searchDropdown) searchDropdown.classList.add('d-none');
        }
      });
    }

    // Notification Bell
    const notifBtn = document.getElementById('topbar-notif-btn');
    if (notifBtn) {
      notifBtn.addEventListener('click', () => {
        const { activityLogs, tickets } = store.getState();
        const flightReminders = getUpcomingFlightReminders(tickets || []);
        const recent = (activityLogs || []).slice(0, 4);

        openModal({
          title: t('modals.notifications.title'),
          subtitle: t('modals.notifications.subtitle'),
          maxWidth: '480px',
          contentHtml: `
            <div class="d-flex flex-column gap-sm">
              ${flightReminders.length > 0 ? `
                <div class="d-flex flex-column gap-sm mb-xs">
                  ${flightReminders.map(r => `
                    <a href="/tickets/${r.ticketId}" data-link class="p-sm notif-reminder-item" style="display:block; background-color: var(--color-warning-soft, #fff8e6); border-radius: var(--radius-md); border: 1px solid var(--color-warning, #f0b429); text-decoration: none; color: inherit;">
                      <div class="d-flex justify-between text-xs text-muted mb-xxs">
                        <strong style="color: #b45309;">${r.type === 'DEPARTURE' ? escapeHtml(t('notifications.departureSoon')) : escapeHtml(t('notifications.returnSoon'))}</strong>
                        <span>${r.date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                      </div>
                      <div class="text-sm font-medium">${escapeHtml(r.passengerName)} — ${escapeHtml(r.route)}</div>
                      <div class="text-xs text-muted">${r.ticketNumber ? escapeHtml(r.ticketNumber) : escapeHtml(r.ticketId)}</div>
                    </a>
                  `).join('')}
                </div>
              ` : ''}
              ${recent.map(r => `
                <div class="p-sm" style="background-color: var(--color-surface); border-radius: var(--radius-md); border: 1px solid var(--color-border-soft);">
                  <div class="d-flex justify-between text-xs text-muted mb-xxs">
                    <strong>${escapeHtml(r.user)}</strong>
                    <span>${new Date(r.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <div class="text-sm font-medium">${escapeHtml(r.description)}</div>
                </div>
              `).join('')}
              ${flightReminders.length === 0 && recent.length === 0 ? `
                <div class="p-md text-center text-sm text-muted">
                  ${escapeHtml(t('common.noRecords')) || 'No notifications'}
                </div>
              ` : ''}
            </div>
          `,
          footerHtml: `
            <a href="/activity" class="btn btn-sm btn-primary" id="view-all-audit-btn" data-link>${escapeHtml(t('modals.notifications.viewAll'))}</a>
          `,
          onOpen: (modalEl) => {
            const link = modalEl.querySelector('#view-all-audit-btn');
            if (link) {
              link.addEventListener('click', () => closeModal());
            }
            const reminderLinks = modalEl.querySelectorAll('.notif-reminder-item');
            reminderLinks.forEach(rl => {
              rl.addEventListener('click', () => closeModal());
            });
          }
        });
      });
    }

    // Help Button
    const helpBtn = document.getElementById('topbar-help-btn');
    if (helpBtn) {
      helpBtn.addEventListener('click', () => {
        openModal({
          title: t('modals.help.title'),
          subtitle: t('modals.help.subtitle'),
          contentHtml: `
            <div class="d-flex flex-column gap-md text-sm">
              <div>
                <h4 style="margin-bottom: 6px;">${escapeHtml(t('modals.help.workflows'))}</h4>
                <ul style="padding-inline-start: 20px; color: var(--color-text-secondary); line-height: 1.6;">
                  <li><strong>${escapeHtml(t('tickets.createTicket'))}:</strong> ${escapeHtml(t('modals.help.issueTicketDesc'))}</li>
                  <li><strong>${escapeHtml(t('ticketDetails.actions.addPayment'))}:</strong> ${escapeHtml(t('modals.help.recordPaymentDesc'))}</li>
                  <li><strong>${escapeHtml(t('ticketDetails.actions.modifyFlight'))}:</strong> ${escapeHtml(t('modals.help.modifyFlightDesc'))}</li>
                  <li><strong>${escapeHtml(t('ticketDetails.actions.requestRefund'))}:</strong> ${escapeHtml(t('modals.help.refundDesc'))}</li>
                </ul>
              </div>
              <div class="p-sm" style="background-color: var(--color-surface); border-radius: var(--radius-md);">
                <strong>${escapeHtml(t('modals.help.techSupport'))}</strong>
                <p class="text-xs text-muted" style="margin-top: 4px;">${escapeHtml(t('brand.terminal'))} v1.0.0 (Bilingual LTR/RTL)</p>
              </div>
            </div>
          `,
          footerHtml: `
            <button type="button" class="btn btn-secondary" onclick="document.querySelector('#modal-close-trigger')?.click()">${escapeHtml(t('common.close'))}</button>
          `
        });
      });
    }

    // Bind bottom nav drawer toggle
    const bottomNavContainer = document.getElementById('app-bottom-nav-container');
    if (bottomNavContainer) {
      bindBottomNavEvents(bottomNavContainer);
    }

    // Delegated click listener for sidebar sign out & collapse toggle
    document.addEventListener('click', async (e) => {
      // Sidebar collapse toggle
      const collapseBtn = e.target.closest('#sidebar-collapse-toggle');
      if (collapseBtn) {
        e.preventDefault();
        const isNowCollapsed = document.documentElement.classList.toggle('sidebar-collapsed');
        document.body.classList.toggle('sidebar-collapsed', isNowCollapsed);
        localStorage.setItem('africatravel.sidebarCollapsed', isNowCollapsed ? '1' : '0');

        // Re-render sidebar so icon and aria-expanded update
        const sidebarContainer = document.getElementById('app-sidebar-container');
        if (sidebarContainer) {
          sidebarContainer.innerHTML = renderSidebar(window.location.pathname);
        }
        return;
      }

      // Sign out
      const signOutBtn = e.target.closest('#sidebar-sign-out-btn');
      if (signOutBtn) {
        e.preventDefault();
        await AuthService.logout();
        showToast(t('toasts.signedOut'), 'info');
        window.history.pushState(null, null, '/login');
        window.dispatchEvent(new PopStateEvent('popstate'));
      }
    });
  }

  updateHeaderProfile() {
    const currentUser = AuthService.getCurrentUser();
    if (!currentUser) return;
    const nameEl = document.querySelector('.topbar-user-name');
    const roleEl = document.querySelector('.topbar-user-role');
    if (nameEl) nameEl.textContent = currentUser.name || currentUser.fullName || 'Mohamed Raafat';
    if (roleEl) roleEl.textContent = getUserRoleLabel(currentUser);
  }

  updateTopbarBadges() {
    const { tickets } = store.getState();
    const reminders = getUpcomingFlightReminders(tickets || []);
    const count = reminders.length;
    const badgeEl = document.querySelector('.notification-badge');
    if (badgeEl) {
      badgeEl.style.display = count > 0 ? 'flex' : 'none';
      badgeEl.textContent = count > 9 ? '9+' : String(count);
    }
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

// Register Service Worker for PWA installability and shell caching
if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1')) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((err) => {
      console.warn('Service worker registration failed:', err);
    });
  });
}

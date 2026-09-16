/**
 * AfricaTravel — Service Worker
 *
 * Scope is deliberately narrow: this only makes the app installable and
 * speeds up repeat loads of the static shell (HTML/CSS/JS/fonts/icons).
 * It never caches /api/* requests — ticket, customer, and payment data
 * must always come from the network. This app has no real "offline mode";
 * the goal here is a faster, installable shell, not offline data access.
 *
 * Bump CACHE_NAME whenever the shell's cached file list changes, so
 * returning users pick up the new version instead of a stale cache.
 */

const CACHE_NAME = 'africatravel-shell-v6';

const SHELL_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/styles/tokens.css',
  '/styles/base.css',
  '/styles/layout.css',
  '/styles/components.css',
  '/styles/utilities.css',
  '/styles/responsive.css',
  '/js/app.js',
  '/js/bootstrap.js',
  '/js/state/store.js',
  '/js/router/router.js',
  '/js/router/routes.js',
  '/js/i18n/i18n.js',
  '/js/i18n/locales/ar.js',
  '/js/i18n/locales/en.js',
  '/js/services/api-client.js',
  '/js/services/auth-service.js',
  '/js/services/customer-service.js',
  '/js/services/expense-service.js',
  '/js/services/report-service.js',
  '/js/services/ticket-service.js',
  '/js/components/bottom-nav.js',
  '/js/components/empty-state.js',
  '/js/components/icons.js',
  '/js/components/modal.js',
  '/js/components/page-header.js',
  '/js/components/sidebar.js',
  '/js/components/stat-card.js',
  '/js/components/status-badge.js',
  '/js/components/tabs.js',
  '/js/components/toast.js',
  '/js/components/topbar.js',
  '/js/utils/calculations.js',
  '/js/utils/dom.js',
  '/js/utils/flight-reminders.js',
  '/js/utils/online-status.js',
  '/js/utils/security.js',
  '/js/pages/activity.js',
  '/js/pages/customer-details.js',
  '/js/pages/customers.js',
  '/js/pages/dashboard.js',
  '/js/pages/employees.js',
  '/js/pages/expenses.js',
  '/js/pages/login.js',
  '/js/pages/payments.js',
  '/js/pages/refunds.js',
  '/js/pages/reports.js',
  '/js/pages/settings.js',
  '/js/pages/ticket-create.js',
  '/js/pages/ticket-details.js',
  '/js/pages/tickets.js',
  '/assets/favicon.png',
  '/assets/icon-192.png',
  '/assets/icon-512.png',
  '/assets/icon-512-maskable.png',
  '/assets/apple-touch-icon.png',
  '/assets/logo.png',
  '/assets/logo.webp',
  '/assets/savannah-bg.jpg',
  '/assets/savannah-bg.webp'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(SHELL_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Never intercept API calls — always go to the network, and never cache
  // them. This is a live business app; stale ticket/payment data cached
  // offline would be actively misleading, not helpful.
  if (request.url.includes('/api/')) {
    return;
  }

  // Only handle same-origin GET requests for the shell.
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) {
    return;
  }

  // Guaranteed safe Response fallback — avoids 503 errors during navigation
  const offlineResponse = () => new Response('Offline', {
    status: 200,
    headers: { 'Content-Type': 'text/plain; charset=utf-8' }
  });

  // For page navigations (e.g. /dashboard, /tickets, /login), prioritize network
  // and fall back to the cached index.html shell so dynamic routes never fail.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.status === 200) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(async () => {
          const shell = await caches.match('/index.html') || await caches.match('/');
          if (shell) return shell;

          const allCaches = await caches.keys();
          for (const key of allCaches) {
            const c = await caches.open(key);
            const match = await c.match('/index.html') || await c.match('/');
            if (match) return match;
          }

          return offlineResponse();
        })
    );
    return;
  }

  // Stale-while-revalidate with navigation fallback and guaranteed Response safety net
  event.respondWith(
    caches.match(request, { ignoreSearch: true }).then((cached) => {
      const networkFetch = fetch(request)
        .then((response) => {
          if (response && response.status === 200) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, responseClone));
          }
          return response;
        })
        .catch(async () => {
          if (request.mode === 'navigate') {
            const shell = await caches.match('/index.html');
            return shell || offlineResponse();
          }
          return cached || offlineResponse();
        });

      return cached || networkFetch;
    }).catch(offlineResponse)
  );
});

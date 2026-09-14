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

const CACHE_NAME = 'africatravel-shell-v3';

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
  '/assets/favicon.png',
  '/assets/icon-192.png',
  '/assets/icon-512.png'
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

  // Stale-while-revalidate with navigation fallback and guaranteed Response safety net
  const offlineResponse = () => new Response('Offline', { status: 503, statusText: 'Service Unavailable' });

  event.respondWith(
    caches.match(request).then((cached) => {
      const networkFetch = fetch(request)
        .then((response) => {
          if (response && response.status === 200) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, responseClone));
          }
          return response;
        })
        .catch(async () => {
          // Network failed and this URL is not in cache (e.g. dynamic SPA routes like /tickets/TK-XXX).
          // If this is a page navigation, return the cached app shell (/index.html) to prevent crash.
          // Every branch here MUST resolve to a real Response — caches.match() and `cached` can both
          // be undefined, and respondWith() throws "Failed to convert value to 'Response'" if so.
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

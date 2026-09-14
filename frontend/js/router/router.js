/**
 * AfricaTravel — Client-Side SPA Router
 *
 * Handles History API navigation, dynamic parameters, route guards, and 404 state.
 */

import { AuthService } from '../services/auth-service.js';

// Helper functions for modern top loading progress bar
function startRouteProgressBar() {
  if (typeof document === 'undefined') return;
  let bar = document.getElementById('route-progress-bar');
  if (!bar) {
    bar = document.createElement('div');
    bar.id = 'route-progress-bar';
    bar.className = 'route-progress-bar';
    document.body.appendChild(bar);
  }
  bar.style.transition = 'none';
  bar.style.width = '0%';
  bar.style.opacity = '1';
  requestAnimationFrame(() => {
    bar.style.transition = 'width 180ms cubic-bezier(0.16, 1, 0.3, 1), opacity 150ms ease';
    bar.style.width = '70%';
  });
}

function completeRouteProgressBar() {
  if (typeof document === 'undefined') return;
  const bar = document.getElementById('route-progress-bar');
  if (bar) {
    bar.style.width = '100%';
    setTimeout(() => {
      bar.style.opacity = '0';
      setTimeout(() => {
        bar.style.width = '0%';
      }, 200);
    }, 120);
  }
}

export class Router {
  constructor(routes = [], mountElement) {
    this.routes = routes;
    this.mountElement = mountElement;
    this.currentRoute = null;
    this.currentParams = {};
    this.queryParams = {};

    this._onPopState = () => this.resolveCurrentRoute();
    this._onDocumentClick = (e) => {
      const link = e.target.closest('a[data-link]');
      if (link) {
        e.preventDefault();
        const href = link.getAttribute('href');
        if (href) this.navigateTo(href);
      }
    };

    this.init();
  }

  init() {
    window.addEventListener('popstate', this._onPopState);
    document.addEventListener('click', this._onDocumentClick);

    // Resolve initial route on startup
    this.resolveCurrentRoute();
  }

  destroy() {
    window.removeEventListener('popstate', this._onPopState);
    document.removeEventListener('click', this._onDocumentClick);
  }

  navigateTo(path) {
    const currentFull = window.location.pathname + window.location.search;
    if (currentFull === path) return;
    window.history.pushState(null, null, path);
    this.resolveCurrentRoute();
  }

  replaceTo(path) {
    window.history.replaceState(null, null, path);
    this.resolveCurrentRoute();
  }

  matchRoute(pathname) {
    for (const route of this.routes) {
      const paramNames = [];
      const regexPath = route.path
        .replace(/([:*])(\w+)/g, (_, type, name) => {
          paramNames.push(name);
          return '([^/]+)';
        })
        .replace(/\//g, '\\/');

      const regex = new RegExp(`^${regexPath}$`);
      const match = pathname.match(regex);

      if (match) {
        const params = {};
        paramNames.forEach((name, index) => {
          params[name] = decodeURIComponent(match[index + 1]);
        });
        return { route, params };
      }
    }
    return null;
  }

  async resolveCurrentRoute() {
    let pathname = window.location.pathname;
    const isAuthenticated = AuthService.isAuthenticated();

    // Normalize root path '/'
    if (pathname === '/' || pathname === '') {
      pathname = isAuthenticated ? '/dashboard' : '/login';
      window.history.replaceState(null, null, pathname);
    }

    // Protected route guard: unauthenticated users redirect to /login
    if (!isAuthenticated && pathname !== '/login') {
      window.history.replaceState(null, null, '/login');
      pathname = '/login';
    }

    // If authenticated user navigates to /login, redirect to /dashboard
    if (isAuthenticated && pathname === '/login') {
      window.history.replaceState(null, null, '/dashboard');
      pathname = '/dashboard';
    }

    const currentUser = AuthService.getCurrentUser();
    const isTicketOnly = (currentUser?.role || '').toUpperCase() === 'TICKET_ONLY';
    const canViewTicketDetail = /^\/tickets\/[^/]+$/.test(pathname) && !['/tickets/new', '/tickets/create'].includes(pathname);
    if (isTicketOnly && !['/tickets/new', '/tickets/create'].includes(pathname) && !canViewTicketDetail) {
      window.history.replaceState(null, null, '/tickets/new');
      pathname = '/tickets/new';
    }

    const matched = this.matchRoute(pathname);

    // Extract query params
    const searchParams = new URLSearchParams(window.location.search);
    const query = {};
    for (const [key, val] of searchParams.entries()) {
      query[key] = val;
    }
    this.queryParams = query;

    if (matched) {
      this.currentRoute = matched.route;
      this.currentParams = matched.params;
      await this.render(matched.route, matched.params, query);
    } else {
      this.renderNotFound(pathname);
    }

    // Scroll to top
    window.scrollTo(0, 0);

    // Notify app shell of path change (deferred to avoid re-entrant routing)
    queueMicrotask(() => {
      window.dispatchEvent(new CustomEvent('AfricaTravel:route-changed', {
        detail: { path: pathname, route: matched ? matched.route : null }
      }));
    });
  }

  async render(route, params, query) {
    if (!this.mountElement) return;

    if (typeof route.render === 'function') {
      startRouteProgressBar();

      // Trigger smooth entry transition on mount
      this.mountElement.classList.remove('page-enter-active');
      void this.mountElement.offsetWidth; // Force layout recalculation for animation restart

      this.mountElement.innerHTML = '';
      const content = await route.render(params, query);
      if (typeof content === 'string') {
        this.mountElement.innerHTML = content;
      } else if (content instanceof HTMLElement) {
        this.mountElement.appendChild(content);
      }

      this.mountElement.classList.add('page-enter-active');

      if (typeof route.afterRender === 'function') {
        route.afterRender(this.mountElement, params, query);
      }

      completeRouteProgressBar();
    }
  }

  renderNotFound(path) {
    if (!this.mountElement) return;
    this.mountElement.innerHTML = `
      <div class="empty-state" style="margin-top: 60px;">
        <div class="empty-state-title" style="font-size: 32px;">404</div>
        <p class="empty-state-desc">The requested page <span id="notfound-path"></span> was not found.</p>
        <a href="/dashboard" class="btn btn-primary" data-link>Return to Dashboard</a>
      </div>
    `;
    const pathSpan = this.mountElement.querySelector('#notfound-path');
    if (pathSpan) {
      pathSpan.textContent = `"${path}"`;
    }
  }
}

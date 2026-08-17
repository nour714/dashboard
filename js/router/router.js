/**
 * AfriciaTravel — Client-Side SPA Router
 *
 * Handles History API navigation, dynamic parameters, route guards, and 404 state.
 */

import { store } from '../state/store.js';

export class Router {
  constructor(routes = [], mountElement) {
    this.routes = routes;
    this.mountElement = mountElement;
    this.currentRoute = null;
    this.currentParams = {};
    this.queryParams = {};

    this.init();
  }

  init() {
    window.addEventListener('popstate', () => {
      this.resolveCurrentRoute();
    });

    document.addEventListener('click', (e) => {
      const link = e.target.closest('a[data-link]');
      if (link) {
        e.preventDefault();
        const href = link.getAttribute('href');
        if (href) {
          this.navigateTo(href);
        }
      }
    });

    // Resolve the initial route on page load
    this.resolveCurrentRoute();
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

  resolveCurrentRoute() {
    let pathname = window.location.pathname;
    // Normalize root path to /dashboard if logged in or /login if not
    if (pathname === '/' || pathname === '') {
      const { isAuthenticated } = store.getState();
      pathname = isAuthenticated ? '/dashboard' : '/login';
      window.history.replaceState(null, null, pathname);
    }

    const { isAuthenticated } = store.getState();
    if (!isAuthenticated && pathname !== '/login') {
      window.history.replaceState(null, null, '/login');
      pathname = '/login';
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
      this.render(matched.route, matched.params, query);
    } else {
      this.renderNotFound(pathname);
    }

    // Scroll to top
    window.scrollTo(0, 0);

    // Notify document/app shell of path change
    window.dispatchEvent(new CustomEvent('africiatravel:route-changed', {
      detail: { path: pathname, route: matched ? matched.route : null }
    }));
  }

  async render(route, params, query) {
    if (!this.mountElement) return;

    if (typeof route.render === 'function') {
      this.mountElement.innerHTML = '';
      const content = await route.render(params, query);
      if (typeof content === 'string') {
        this.mountElement.innerHTML = content;
      } else if (content instanceof HTMLElement) {
        this.mountElement.appendChild(content);
      }

      if (typeof route.afterRender === 'function') {
        route.afterRender(this.mountElement, params, query);
      }
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

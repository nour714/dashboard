/**
 * AfricaTravel — Topbar Header Component
 */

import { icons } from './icons.js';
import { AuthService } from '../services/auth-service.js';
import { escapeHtml } from '../utils/security.js';

export function renderTopbar() {
  const currentUser = AuthService.getCurrentUser() || {};
  const userName = currentUser.name || currentUser.fullName || 'Ahmed Hassan';
  const userRole = currentUser.title || currentUser.role || 'Senior Operations Director';
  const initials = userName.split(' ').map(n => n[0]).filter(Boolean).join('').substring(0, 2).toUpperCase() || 'AH';

  return `
    <header class="app-topbar">
      <div class="topbar-left">
        <form class="topbar-search-form" id="topbar-global-search">
          <span class="topbar-search-icon">
            ${icons.search('w-4 h-4')}
          </span>
          <input
            type="search"
            class="topbar-search-input"
            id="global-search-input"
            placeholder="Search tickets, PNRs, or customers..."
            aria-label="Search tickets, PNRs, or customers"
            autocomplete="off"
          />
          <div id="topbar-search-dropdown" class="search-dropdown d-none"></div>
        </form>
      </div>

      <div class="topbar-right">
        <a href="/tickets/new" class="topbar-new-ticket-btn hide-mobile" data-link>
          ${icons.plus('w-4 h-4')}
          <span>New Ticket</span>
        </a>

        <button type="button" class="topbar-icon-btn" id="topbar-notif-btn" title="Notifications" aria-label="Notifications and alerts">
          ${icons.bell('w-5 h-5')}
          <span class="notification-badge"></span>
        </button>

        <button type="button" class="topbar-icon-btn hide-mobile" id="topbar-help-btn" title="Help & Documentation" aria-label="Help and operational documentation">
          ${icons.help('w-5 h-5')}
        </button>

        <a href="/settings" class="topbar-user-badge" data-link aria-label="User profile and settings">
          <div class="topbar-user-avatar">
            ${escapeHtml(initials)}
          </div>
          <div class="topbar-user-meta hide-mobile">
            <span class="topbar-user-name">${escapeHtml(userName)}</span>
            <span class="topbar-user-role">${escapeHtml(userRole)}</span>
          </div>
        </a>
      </div>
    </header>
  `;
}

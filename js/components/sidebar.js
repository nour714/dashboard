/**
 * AfricaTravel — Sidebar Component (Desktop & Tablet)
 */

import { icons } from './icons.js';
import { AuthService } from '../services/auth-service.js';
import { escapeHtml } from '../utils/security.js';

export function renderSidebar(activePath = '/dashboard') {
  const currentUser = AuthService.getCurrentUser() || {};
  const userName = currentUser.name || currentUser.fullName || 'Mohamed Raafat';
  const userRole = currentUser.title || currentUser.role || 'Senior Operations Director';
  const initials = userName.split(' ').map(n => n[0]).filter(Boolean).join('').substring(0, 2).toUpperCase() || 'AH';

  const mainNav = [
    { path: '/dashboard', label: 'Dashboard', icon: 'dashboard' },
    { path: '/tickets', label: 'Tickets', icon: 'ticket' },
    { path: '/customers', label: 'Customers', icon: 'customers' },
    { path: '/payments', label: 'Payments', icon: 'payments' },
    { path: '/refunds', label: 'Refunds', icon: 'refunds' },
    { path: '/reports', label: 'Reports', icon: 'reports' }
  ];

  const adminNav = [
    { path: '/employees', label: 'Employees', icon: 'employees' },
    { path: '/activity', label: 'Activity Log', icon: 'activity' },
    { path: '/settings', label: 'Settings', icon: 'settings' }
  ];

  const renderLinks = (items) => items.map(item => {
    const isActive = activePath === item.path ||
      (item.path !== '/dashboard' && activePath.startsWith(item.path));
    const iconSvg = typeof icons[item.icon] === 'function' ? icons[item.icon]('nav-icon') : '';

    return `
      <a href="${item.path}" class="nav-link ${isActive ? 'active' : ''}" data-link title="${item.label}">
        ${iconSvg}
        <span>${item.label}</span>
      </a>
    `;
  }).join('');

  return `
    <aside class="app-sidebar" id="app-sidebar">
      <div class="sidebar-header">
        <a href="/dashboard" class="sidebar-logo" data-link aria-label="AfricaTravel Home Dashboard">
          <div class="sidebar-logo-icon">
            <img src="/assets/logo.png" alt="AfricaTravel Logo" class="sidebar-logo-img" />
          </div>
          <div class="sidebar-logo-text">
            <span class="sidebar-logo-title">AfricaTravel</span>
            <span class="sidebar-logo-subtitle">Travel Operations</span>
          </div>
        </a>
      </div>

      <div class="sidebar-action-wrap">
        <a href="/tickets/new" class="sidebar-new-btn" data-link>
          ${icons.plus('w-4 h-4')}
          <span>New Ticket</span>
        </a>
      </div>

      <nav class="sidebar-nav" aria-label="Main Navigation">
        ${renderLinks(mainNav)}
        <div class="sidebar-divider"></div>
        ${renderLinks(adminNav)}
      </nav>

      <div class="sidebar-footer">
        <a href="/settings" class="sidebar-user" data-link>
          <div class="sidebar-user-avatar">
            ${escapeHtml(initials)}
          </div>
          <div class="sidebar-user-info">
            <span class="sidebar-user-name">${escapeHtml(userName)}</span>
            <span class="sidebar-user-role">${escapeHtml(userRole)}</span>
          </div>
        </a>
      </div>
    </aside>
  `;
}

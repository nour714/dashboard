/**
 * AfricaTravel — Sidebar Component (Desktop & Tablet)
 */

import { icons } from './icons.js';
import { AuthService } from '../services/auth-service.js';
import { escapeHtml } from '../utils/security.js';
import { i18n, t } from '../i18n/i18n.js';

export function renderSidebar(activePath = '/dashboard') {
  const currentUser = AuthService.getCurrentUser() || {};
  const isTicketOnly = (currentUser.role || '').toUpperCase() === 'TICKET_ONLY';
  const isAr = i18n.getLanguage() === 'ar';
  const rawName = currentUser.name || currentUser.fullName || 'Mohamed Raafat';
  const userName = (rawName === 'Mohamed Raafat' && isAr) ? 'محمد رأفت' : rawName;
  const rawRole = currentUser.title || currentUser.role || 'Senior Operations Director';
  const roleKey = `roles.${rawRole}`;
  const translatedRole = t(roleKey);
  const userRole = (translatedRole && translatedRole !== roleKey) ? translatedRole : rawRole;
  const initials = isAr ? 'م.ر' : (userName.split(' ').map(n => n[0]).filter(Boolean).join('').substring(0, 2).toUpperCase() || 'MR');

  const mainNav = [
    { path: '/dashboard', label: t('nav.dashboard'), icon: 'dashboard' },
    { path: '/tickets', label: t('nav.tickets'), icon: 'ticket' },
    { path: '/customers', label: t('nav.customers'), icon: 'customers' },
    { path: '/payments', label: t('nav.payments'), icon: 'payments' },
    { path: '/refunds', label: t('nav.refunds'), icon: 'refunds' },
    { path: '/reports', label: t('nav.reports'), icon: 'reports' }
  ];

  const isAdmin = (currentUser.role || '').toUpperCase() === 'ADMIN';

  const adminNav = [
    ...(isAdmin ? [{ path: '/employees', label: t('nav.employees'), icon: 'employees' }] : []),
    { path: '/activity', label: t('nav.activity'), icon: 'activity' },
    { path: '/settings', label: t('nav.settings'), icon: 'settings' }
  ];

  const renderLinks = (items) => items.map(item => {
    const isActive = activePath === item.path ||
      (item.path !== '/dashboard' && activePath.startsWith(item.path));
    const iconSvg = typeof icons[item.icon] === 'function' ? icons[item.icon]('nav-icon') : '';

    return `
      <a href="${item.path}" class="nav-link ${isActive ? 'active' : ''}" data-link title="${escapeHtml(item.label)}">
        ${iconSvg}
        <span>${escapeHtml(item.label)}</span>
      </a>
    `;
  }).join('');

  return `
    <aside class="app-sidebar" id="app-sidebar">
      <div class="sidebar-header">
        <a href="${isTicketOnly ? '/tickets/new' : '/dashboard'}" class="sidebar-logo" data-link aria-label="${escapeHtml(t('dashboard.title'))}">
          <div class="sidebar-logo-icon">
            <img src="/assets/logo.png" alt="AfricaTravel Logo" class="sidebar-logo-img no-flip" />
          </div>
          <div class="sidebar-logo-text">
            <span class="sidebar-logo-title">AfricaTravel</span>
            <span class="sidebar-logo-subtitle">${escapeHtml(t('brand.tagline'))}</span>
          </div>
        </a>
      </div>

      <div class="sidebar-action-wrap">
        <a href="/tickets/new" class="sidebar-new-btn" data-link>
          ${icons.plus('w-4 h-4')}
          <span>${escapeHtml(t('nav.newTicket'))}</span>
        </a>
      </div>

      <nav class="sidebar-nav" aria-label="${escapeHtml(t('nav.administration'))}">
        ${isTicketOnly ? '' : `${renderLinks(mainNav)}
        <div class="sidebar-divider"></div>
        ${renderLinks(adminNav)}`}
      </nav>

      <div class="sidebar-footer">
        <a href="${isTicketOnly ? '/tickets/new' : '/settings'}" class="sidebar-user" data-link aria-label="${escapeHtml(t('settings.tabs.profile'))}">
          <div class="sidebar-user-avatar">
            ${escapeHtml(initials)}
          </div>
          <div class="sidebar-user-info">
            <span class="sidebar-user-name">${escapeHtml(userName)}</span>
            <span class="sidebar-user-role">${escapeHtml(userRole)}</span>
          </div>
        </a>
        <button type="button" class="sidebar-signout-btn" id="sidebar-sign-out-btn" title="${escapeHtml(t('common.signOut'))}">
          ${icons.logOut('w-4 h-4')}
          <span>${escapeHtml(t('common.signOut'))}</span>
        </button>
      </div>
    </aside>
  `;
}

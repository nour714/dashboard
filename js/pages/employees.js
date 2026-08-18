/**
 * AfricaTravel — Employees Administration Page
 */

import { store } from '../state/store.js';
import { icons } from '../components/icons.js';
import { renderPageHeader } from '../components/page-header.js';
import { renderStatusBadge } from '../components/status-badge.js';
import { formatCurrency } from '../utils/calculations.js';
import { escapeHtml } from '../utils/security.js';
import { t } from '../i18n/i18n.js';

let roleFilter = 'All Roles';
let statusFilter = 'All Statuses';

export const EmployeesPage = {
  render() {
    const { employees } = store.getState();

    let filtered = employees;
    if (roleFilter !== 'All Roles') {
      filtered = filtered.filter(e => e.role === roleFilter);
    }
    if (statusFilter !== 'All Statuses') {
      filtered = filtered.filter(e => e.status === statusFilter);
    }

    const headerHtml = renderPageHeader({
      title: t('employees.title'),
      subtitle: t('employees.subtitle'),
      actionsHtml: ''
    });

    const rowsHtml = filtered.map(e => `
      <tr>
        <td>
          <div class="d-flex items-center gap-sm">
            <div class="sidebar-user-avatar" style="width: 36px; height: 36px; font-size: 13px; background-color: ${e.role === 'ADMIN' ? '#1e3a8a' : '#2563eb'};">
              ${escapeHtml(e.name.split(' ').map(n => n[0]).filter(Boolean).join('').substring(0, 2).toUpperCase())}
            </div>
            <div>
              <div class="cell-main">${escapeHtml(e.name)}</div>
              <div class="cell-sub ltr-data">${escapeHtml(e.email)}</div>
            </div>
          </div>
        </td>
        <td>
          <span class="badge ${e.role === 'ADMIN' ? 'badge-admin' : 'badge-agent'}">${escapeHtml(e.role)}</span>
        </td>
        <td class="tabular-nums font-semibold">${e.ticketsCount}</td>
        <td class="tabular-nums font-semibold">${formatCurrency(e.sales, 'EGP')}</td>
        <td class="tabular-nums font-semibold text-success">${formatCurrency(e.collected, 'EGP')}</td>
        <td class="tabular-nums text-muted">${formatCurrency(e.refunds, 'EGP')}</td>
        <td>${renderStatusBadge(e.status)}</td>
      </tr>
    `).join('');

    return `
      ${headerHtml}

      <!-- Admin Secondary Nav Tabs -->
      <div class="tabs-header mb-lg" style="border-radius: var(--radius-xl); border: 1px solid var(--color-border-soft);">
        <a href="/employees" class="tab-btn active" data-link>${escapeHtml(t('nav.employees'))}</a>
        <a href="/activity" class="tab-btn" data-link>${escapeHtml(t('nav.activity'))}</a>
        <a href="/settings" class="tab-btn" data-link>${escapeHtml(t('nav.settings'))}</a>
      </div>

      <!-- Employees Table Card -->
      <div class="card">
        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>${escapeHtml(t('employees.table.name'))}</th>
                <th>${escapeHtml(t('employees.table.role'))}</th>
                <th>${escapeHtml(t('nav.tickets'))}</th>
                <th>${escapeHtml(t('dashboard.kpi.totalSales'))}</th>
                <th>${escapeHtml(t('dashboard.kpi.totalCollected'))}</th>
                <th>${escapeHtml(t('reports.kpi.refundsTotal'))}</th>
                <th>${escapeHtml(t('employees.table.status'))}</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml || `<tr><td colspan="7" class="text-center text-muted p-lg">${escapeHtml(t('common.noData'))}</td></tr>`}
            </tbody>
          </table>
        </div>
      </div>
    `;
  },

  afterRender(container) {
    // Dynamic event bindings if needed
  }
};

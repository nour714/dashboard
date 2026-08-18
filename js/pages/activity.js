/**
 * AfricaTravel — Audit Trail / Activity Log Page
 */

import { store } from '../state/store.js';
import { icons } from '../components/icons.js';
import { renderPageHeader } from '../components/page-header.js';
import { formatDateTime, formatRelativeTime } from '../utils/calculations.js';
import { escapeHtml } from '../utils/security.js';
import { t } from '../i18n/i18n.js';

let actFilters = {
  employee: 'All Employees',
  actionType: 'All Actions',
  ticketQuery: ''
};

export const ActivityPage = {
  render() {
    const { activityLogs, employees } = store.getState();

    let logs = [...activityLogs];

    if (actFilters.employee !== 'All Employees') {
      logs = logs.filter(l => l.user === actFilters.employee);
    }
    if (actFilters.actionType !== 'All Actions') {
      logs = logs.filter(l => l.action === actFilters.actionType);
    }
    if (actFilters.ticketQuery) {
      const q = actFilters.ticketQuery.toLowerCase().trim();
      logs = logs.filter(l =>
        (l.ticketId && l.ticketId.toLowerCase().includes(q)) ||
        (l.customerId && l.customerId.toLowerCase().includes(q)) ||
        (l.description && l.description.toLowerCase().includes(q))
      );
    }

    const headerHtml = renderPageHeader({
      title: t('activity.title'),
      subtitle: t('activity.subtitle')
    });

    const getActionBadgeClass = (action) => {
      switch (action) {
        case 'CREATE_TICKET': return 'badge-confirmed';
        case 'ADD_PAYMENT': return 'badge-paid';
        case 'MODIFY_FLIGHT': return 'badge-modified';
        case 'COMPLETE_REFUND':
        case 'ADD_REFUND': return 'badge-cancelled';
        default: return 'badge-neutral';
      }
    };

    const rowsHtml = logs.map(l => `
      <tr>
        <td>
          <div class="cell-main">${formatDateTime(l.timestamp)}</div>
          <div class="cell-sub">${formatRelativeTime(l.timestamp)}</div>
        </td>
        <td>
          <div class="d-flex items-center gap-xs">
            <div class="sidebar-user-avatar" style="width: 26px; height: 26px; font-size: 11px;">
              ${escapeHtml(l.user ? l.user.charAt(0) : 'U')}
            </div>
            <span class="font-medium text-sm">${escapeHtml(l.user)}</span>
          </div>
        </td>
        <td>
          <span class="badge ${getActionBadgeClass(l.action)}">${escapeHtml(l.action)}</span>
        </td>
        <td>
          ${l.ticketId ? `<a href="/tickets/${escapeHtml(l.ticketId)}" class="cell-main text-accent ltr-data" data-link>${escapeHtml(l.ticketId)}</a>` : ''}
          ${l.customerId ? `<a href="/customers/${escapeHtml(l.customerId)}" class="cell-sub text-muted ltr-data" data-link>${escapeHtml(l.customerId)}</a>` : ''}
          ${!l.ticketId && !l.customerId ? '--' : ''}
        </td>
        <td>
          <span class="text-sm">${escapeHtml(l.description)}</span>
        </td>
      </tr>
    `).join('');

    return `
      ${headerHtml}

      <!-- Admin Secondary Nav Tabs -->
      <div class="tabs-header mb-lg" style="border-radius: var(--radius-xl); border: 1px solid var(--color-border-soft);">
        <a href="/employees" class="tab-btn" data-link>${escapeHtml(t('nav.employees'))}</a>
        <a href="/activity" class="tab-btn active" data-link>${escapeHtml(t('nav.activity'))}</a>
        <a href="/settings" class="tab-btn" data-link>${escapeHtml(t('nav.settings'))}</a>
      </div>

      <!-- Activity Logs Table -->
      <div class="card">
        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>${escapeHtml(t('activity.table.timestamp'))}</th>
                <th>${escapeHtml(t('activity.table.user'))}</th>
                <th>${escapeHtml(t('activity.table.action'))}</th>
                <th>${escapeHtml(t('activity.table.entity'))}</th>
                <th>${escapeHtml(t('activity.table.description'))}</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml || `<tr><td colspan="5" class="text-center text-muted p-lg">${escapeHtml(t('common.noData'))}</td></tr>`}
            </tbody>
          </table>
        </div>
      </div>
    `;
  },

  afterRender(container) {
    // Dynamic bindings
  }
};

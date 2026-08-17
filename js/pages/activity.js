/**
 * AfricaTravel — Audit Trail / Activity Log Page
 */

import { store } from '../state/store.js';
import { icons } from '../components/icons.js';
import { renderPageHeader } from '../components/page-header.js';
import { formatDateTime, formatRelativeTime } from '../utils/calculations.js';
import { escapeHtml } from '../utils/security.js';

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
      title: 'Audit Trail',
      subtitle: 'Complete chronological history of all workspace operations and system actions.'
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
          ${l.ticketId ? `<a href="/tickets/${escapeHtml(l.ticketId)}" class="cell-main text-accent" data-link>${escapeHtml(l.ticketId)}</a>` : ''}
          ${l.customerId ? `<a href="/customers/${escapeHtml(l.customerId)}" class="cell-sub text-muted" data-link>${escapeHtml(l.customerId)}</a>` : ''}
          ${!l.ticketId && !l.customerId ? '—' : ''}
        </td>
        <td>
          <span class="text-sm">${escapeHtml(l.description)}</span>
        </td>
      </tr>
    `).join('');

    const timelineMobileHtml = logs.map(l => `
      <div class="timeline-item">
        <div class="timeline-marker ${l.action.includes('PAY') ? 'success' : (l.action.includes('REF') ? 'warning' : 'primary')}">
          ${icons.activity('w-4 h-4')}
        </div>
        <div class="timeline-content">
          <div class="timeline-header">
            <span class="timeline-title">${escapeHtml(l.user)}</span>
            <span class="timeline-time">${formatRelativeTime(l.timestamp)}</span>
          </div>
          <div class="mb-xs">
            <span class="badge ${getActionBadgeClass(l.action)}">${escapeHtml(l.action)}</span>
          </div>
          <p class="timeline-desc">${escapeHtml(l.description)}</p>
        </div>
      </div>
    `).join('');

    return `
      ${headerHtml}

      <!-- Admin Secondary Nav Tabs -->
      <div class="tabs-header mb-lg" style="border-radius: var(--radius-xl); border: 1px solid var(--color-border-soft);">
        <a href="/employees" class="tab-btn" data-link>Employees</a>
        <a href="/activity" class="tab-btn active" data-link>Activity Log</a>
        <a href="/settings" class="tab-btn" data-link>Settings</a>
      </div>

      <!-- Filters -->
      <div class="filter-bar">
        <div class="filter-item">
          <label class="text-sm text-muted" for="act-emp-filter">EMPLOYEE</label>
          <select id="act-emp-filter" class="form-control" style="width: 160px;">
            <option value="All Employees">All Employees</option>
            ${employees.map(e => `<option value="${escapeHtml(e.name)}" ${actFilters.employee === e.name ? 'selected' : ''}>${escapeHtml(e.name)}</option>`).join('')}
          </select>
        </div>

        <div class="filter-item">
          <label class="text-sm text-muted" for="act-action-filter">ACTION TYPE</label>
          <select id="act-action-filter" class="form-control" style="width: 170px;">
            <option value="All Actions" ${actFilters.actionType === 'All Actions' ? 'selected' : ''}>All Actions</option>
            <option value="CREATE_TICKET" ${actFilters.actionType === 'CREATE_TICKET' ? 'selected' : ''}>CREATE_TICKET</option>
            <option value="ADD_PAYMENT" ${actFilters.actionType === 'ADD_PAYMENT' ? 'selected' : ''}>ADD_PAYMENT</option>
            <option value="MODIFY_FLIGHT" ${actFilters.actionType === 'MODIFY_FLIGHT' ? 'selected' : ''}>MODIFY_FLIGHT</option>
            <option value="COMPLETE_REFUND" ${actFilters.actionType === 'COMPLETE_REFUND' ? 'selected' : ''}>COMPLETE_REFUND</option>
            <option value="UPDATE_CUSTOMER" ${actFilters.actionType === 'UPDATE_CUSTOMER' ? 'selected' : ''}>UPDATE_CUSTOMER</option>
          </select>
        </div>

        <div class="view-search-box flex-1">
          ${icons.search()}
          <input
            type="search"
            class="form-control"
            id="act-ticket-search"
            placeholder="Search by ticket #, customer, or keyword..."
            value="${escapeHtml(actFilters.ticketQuery)}"
          />
        </div>
      </div>

      <!-- Desktop Table -->
      <div class="card desktop-table-view">
        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>TIMESTAMP</th>
                <th>USER</th>
                <th>ACTION</th>
                <th>TICKET / CUSTOMER</th>
                <th>DESCRIPTION</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml || '<tr><td colspan="5" class="text-center text-muted p-lg">No audit events match your filter criteria.</td></tr>'}
            </tbody>
          </table>
        </div>
      </div>

      <!-- Mobile Timeline -->
      <div class="mobile-card-view timeline p-sm" style="display: none;">
        ${timelineMobileHtml}
      </div>
    `;
  },

  afterRender(container) {
    const empSelect = container.querySelector('#act-emp-filter');
    const actSelect = container.querySelector('#act-action-filter');
    const searchInput = container.querySelector('#act-ticket-search');

    const updateView = () => {
      container.innerHTML = ActivityPage.render();
      ActivityPage.afterRender(container);
    };

    if (empSelect) {
      empSelect.addEventListener('change', (e) => {
        actFilters.employee = e.target.value;
        updateView();
      });
    }

    if (actSelect) {
      actSelect.addEventListener('change', (e) => {
        actFilters.actionType = e.target.value;
        updateView();
      });
    }

    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        actFilters.ticketQuery = e.target.value;
        updateView();
      });
    }
  }
};

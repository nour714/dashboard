/**
 * AfriciaTravel — Employees Administration Page
 */

import { store } from '../state/store.js';
import { icons } from '../components/icons.js';
import { renderPageHeader } from '../components/page-header.js';
import { renderStatusBadge } from '../components/status-badge.js';
import { openModal, closeModal } from '../components/modal.js';
import { showToast } from '../components/toast.js';
import { formatCurrency } from '../utils/calculations.js';

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
      title: 'Administration',
      subtitle: 'Manage team members, monitor operational activity, and configure workspace settings.',
      actionsHtml: `
        <button type="button" class="btn btn-primary" id="invite-employee-btn">
          ${icons.plus('w-4 h-4')}
          <span>Invite Employee</span>
        </button>
      `
    });

    const rowsHtml = filtered.map(e => `
      <tr>
        <td style="width: 40px;">
          <input type="checkbox" style="cursor: pointer;" />
        </td>
        <td>
          <div class="d-flex items-center gap-sm">
            <div class="sidebar-user-avatar" style="width: 36px; height: 36px; font-size: 13px; background-color: ${e.role === 'ADMIN' ? '#1e3a8a' : '#2563eb'};">
              ${e.name.split(' ').map(n => n[0]).filter(Boolean).join('').substring(0, 2).toUpperCase()}
            </div>
            <div>
              <div class="cell-main">${e.name}</div>
              <div class="cell-sub">${e.email}</div>
            </div>
          </div>
        </td>
        <td>
          <span class="badge ${e.role === 'ADMIN' ? 'badge-admin' : 'badge-agent'}">${e.role}</span>
        </td>
        <td class="tabular-nums font-semibold">${e.ticketsCount}</td>
        <td class="tabular-nums font-semibold">${formatCurrency(e.sales, 'EGP')}</td>
        <td class="tabular-nums font-semibold text-success">${formatCurrency(e.collected, 'EGP')}</td>
        <td class="tabular-nums text-muted">${formatCurrency(e.refunds, 'EGP')}</td>
        <td class="tabular-nums font-semibold ${e.outstanding > 0 ? 'text-danger' : 'text-muted'}">${formatCurrency(e.outstanding, 'EGP')}</td>
        <td>${renderStatusBadge(e.status)}</td>
      </tr>
    `).join('');

    const mobileCardsHtml = filtered.map(e => `
      <div class="mobile-data-card">
        <div class="mobile-card-top">
          <div class="d-flex items-center gap-sm">
            <div class="sidebar-user-avatar" style="width: 34px; height: 34px; font-size: 12px;">
              ${e.name.charAt(0)}
            </div>
            <div>
              <strong style="font-size: 15px;">${e.name}</strong>
              <div class="text-xs text-muted">${e.email}</div>
            </div>
          </div>
          ${renderStatusBadge(e.status)}
        </div>
        <div class="d-flex justify-between items-center text-sm pt-xs" style="border-top: 1px solid var(--color-border-soft);">
          <span>Role: <strong>${e.role}</strong></span>
          <span>Sales: <strong class="tabular-nums">${formatCurrency(e.sales, 'EGP')}</strong></span>
        </div>
      </div>
    `).join('');

    return `
      ${headerHtml}

      <!-- Admin Secondary Nav Tabs -->
      <div class="tabs-header mb-lg" style="border-radius: var(--radius-xl); border: 1px solid var(--color-border-soft);">
        <a href="/employees" class="tab-btn active" data-link>Employees</a>
        <a href="/activity" class="tab-btn" data-link>Activity Log</a>
        <a href="/settings" class="tab-btn" data-link>Settings</a>
      </div>

      <!-- Filter Controls -->
      <div class="filter-bar">
        <div class="filter-item">
          <label class="text-sm text-muted" for="emp-role-filter">ROLE</label>
          <select id="emp-role-filter" class="form-control" style="width: 140px;">
            <option value="All Roles" ${roleFilter === 'All Roles' ? 'selected' : ''}>All Roles</option>
            <option value="ADMIN" ${roleFilter === 'ADMIN' ? 'selected' : ''}>ADMIN</option>
            <option value="AGENT" ${roleFilter === 'AGENT' ? 'selected' : ''}>AGENT</option>
          </select>
        </div>

        <div class="filter-item">
          <label class="text-sm text-muted" for="emp-status-filter">STATUS</label>
          <select id="emp-status-filter" class="form-control" style="width: 140px;">
            <option value="All Statuses" ${statusFilter === 'All Statuses' ? 'selected' : ''}>All Statuses</option>
            <option value="ACTIVE" ${statusFilter === 'ACTIVE' ? 'selected' : ''}>ACTIVE</option>
            <option value="AWAY" ${statusFilter === 'AWAY' ? 'selected' : ''}>AWAY</option>
          </select>
        </div>
      </div>

      <!-- Table Card -->
      <div class="card">
        <div class="table-responsive desktop-table-view">
          <table class="data-table">
            <thead>
              <tr>
                <th><input type="checkbox" /></th>
                <th>EMPLOYEE</th>
                <th>ROLE</th>
                <th>TICKETS</th>
                <th>SALES</th>
                <th>COLLECTED</th>
                <th>REFUNDS</th>
                <th>OUTSTANDING</th>
                <th>STATUS</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>
        </div>

        <div class="mobile-card-list mobile-card-view p-sm" style="display: none;">
          ${mobileCardsHtml}
        </div>
      </div>
    `;
  },

  afterRender(container) {
    const roleSelect = container.querySelector('#emp-role-filter');
    const statusSelect = container.querySelector('#emp-status-filter');
    const inviteBtn = container.querySelector('#invite-employee-btn');

    if (roleSelect) {
      roleSelect.addEventListener('change', (e) => {
        roleFilter = e.target.value;
        container.innerHTML = EmployeesPage.render();
        EmployeesPage.afterRender(container);
      });
    }

    if (statusSelect) {
      statusSelect.addEventListener('change', (e) => {
        statusFilter = e.target.value;
        container.innerHTML = EmployeesPage.render();
        EmployeesPage.afterRender(container);
      });
    }

    if (inviteBtn) {
      inviteBtn.addEventListener('click', () => {
        openModal({
          title: 'Invite Team Member',
          subtitle: 'Send workspace invitation to new agent',
          contentHtml: `
            <div class="d-flex flex-column gap-md">
              <div class="form-group">
                <label class="form-label" for="invite-emp-name">Full Name *</label>
                <input type="text" id="invite-emp-name" class="form-control" placeholder="e.g. Karim El-Sayed" required />
              </div>
              <div class="form-group">
                <label class="form-label" for="invite-emp-email">Work Email *</label>
                <input type="email" id="invite-emp-email" class="form-control" placeholder="karim@africiatravel.com" required />
              </div>
              <div class="form-group">
                <label class="form-label" for="invite-emp-role">Assigned Role</label>
                <select id="invite-emp-role" class="form-control">
                  <option value="AGENT">Ticketing Officer (Agent)</option>
                  <option value="ADMIN">Operations Director (Admin)</option>
                </select>
              </div>
            </div>
          `,
          footerHtml: `
            <button type="button" class="btn btn-secondary" id="invite-cancel">Cancel</button>
            <button type="button" class="btn btn-primary" id="invite-submit">Send Invite</button>
          `,
          onOpen: (modalEl) => {
            const cancelBtn = modalEl.querySelector('#invite-cancel');
            const submitBtn = modalEl.querySelector('#invite-submit');

            if (cancelBtn) cancelBtn.addEventListener('click', closeModal);

            if (submitBtn) {
              submitBtn.addEventListener('click', () => {
                const name = modalEl.querySelector('#invite-emp-name').value.trim();
                const email = modalEl.querySelector('#invite-emp-email').value.trim();
                const role = modalEl.querySelector('#invite-emp-role').value;

                if (!name || !email) {
                  showToast('Please enter both name and email', 'error');
                  return;
                }

                store.addEmployee({ name, email, role });
                closeModal();
                showToast(`Invitation sent to ${email}!`, 'success');
                container.innerHTML = EmployeesPage.render();
                EmployeesPage.afterRender(container);
              });
            }
          }
        });
      });
    }
  }
};

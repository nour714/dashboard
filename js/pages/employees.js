/**
 * AfricaTravel — Employees Administration Page
 */

import { store } from '../state/store.js';
import { AuthService } from '../services/auth-service.js';
import { icons } from '../components/icons.js';
import { renderPageHeader } from '../components/page-header.js';
import { renderStatusBadge } from '../components/status-badge.js';
import { openModal, closeModal } from '../components/modal.js';
import { showToast } from '../components/toast.js';
import { formatCurrency } from '../utils/calculations.js';
import { escapeHtml } from '../utils/security.js';
import { isEmployeeOnline, formatLastSeen } from '../utils/online-status.js';
import { t } from '../i18n/i18n.js';

let roleFilter = 'All Roles';
let statusFilter = 'All Statuses';
let employeePollingTimer = null;

function showEmployeeCreatedConfirmation(email, password) {
  openModal({
    title: t('employees.newEmployeeCredentials'),
    contentHtml: `
      <div class="d-flex flex-column gap-md">
        <p class="text-muted">${escapeHtml(t('employees.credentialsWarning'))}</p>
        <div class="form-group">
          <label class="form-label">${escapeHtml(t('employees.table.email'))}</label>
          <div class="d-flex gap-sm">
            <code class="form-control ltr-data" style="display: block; overflow-wrap: anywhere;">${escapeHtml(email)}</code>
            <button type="button" class="btn btn-secondary" id="copy-employee-email">${escapeHtml(t('employees.copy'))}</button>
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">${escapeHtml(t('employees.password'))}</label>
          <div class="d-flex gap-sm">
            <code class="form-control ltr-data" style="display: block; overflow-wrap: anywhere;">${escapeHtml(password)}</code>
            <button type="button" class="btn btn-secondary" id="copy-employee-password">${escapeHtml(t('employees.copy'))}</button>
          </div>
        </div>
      </div>
    `,
    footerHtml: `<button type="button" class="btn btn-primary" id="employee-credentials-done">${escapeHtml(t('employees.done'))}</button>`,
    onOpen: (modalEl) => {
      const copy = (selector, value) => modalEl.querySelector(selector)?.addEventListener('click', async () => {
        try {
          await navigator.clipboard.writeText(value);
          showToast(t('employees.copied'), 'success');
        } catch {
          showToast(t('employees.copyFailed'), 'error');
        }
      });
      copy('#copy-employee-email', email);
      copy('#copy-employee-password', password);
      modalEl.querySelector('#employee-credentials-done')?.addEventListener('click', closeModal);
    }
  });
}

function openDeleteEmployeeModal(employee, container) {
  openModal({
    title: `${escapeHtml(t('employees.deleteTitle'))} — ${escapeHtml(employee.name)}`,
    subtitle: `${escapeHtml(employee.email)} (${escapeHtml(employee.role)})`,
    contentHtml: `
      <div class="d-flex flex-column gap-md">
        <div class="p-md rounded-md" style="background-color: rgba(239, 68, 68, 0.08); border: 1px solid rgba(239, 68, 68, 0.2); border-radius: var(--radius-md);">
          <div class="font-semibold text-danger mb-xs" style="font-size: 14px;">
            ⚠️ ${escapeHtml(t('employees.deleteWarning'))}
          </div>
          <p class="text-xs text-muted" style="margin: 0; line-height: 1.5;">
            ${escapeHtml(t('employees.deleteExplanation'))}
          </p>
        </div>

        <div class="form-group">
          <label class="form-label">${escapeHtml(t('employees.deleteTypeEmail'))} (${escapeHtml(employee.email)})</label>
          <input type="text" id="delete-employee-confirm-input" class="form-control ltr-field" autocomplete="off" placeholder="${escapeHtml(employee.email)}" />
        </div>

        <div id="delete-employee-error-box" class="p-sm text-sm text-danger" style="display: none; background-color: rgba(239, 68, 68, 0.1); border-radius: var(--radius-md); border: 1px solid rgba(239, 68, 68, 0.3);"></div>
      </div>
    `,
    footerHtml: `
      <button type="button" class="btn btn-secondary" id="modal-cancel-delete-employee">${escapeHtml(t('common.cancel'))}</button>
      <button type="button" class="btn btn-danger" id="modal-confirm-delete-employee" disabled>${escapeHtml(t('common.delete'))}</button>
    `,
    onOpen: (modalEl) => {
      const cancelBtn = modalEl.querySelector('#modal-cancel-delete-employee');
      const confirmBtn = modalEl.querySelector('#modal-confirm-delete-employee');
      const confirmInput = modalEl.querySelector('#delete-employee-confirm-input');
      const errorBox = modalEl.querySelector('#delete-employee-error-box');

      if (cancelBtn) cancelBtn.addEventListener('click', closeModal);

      if (confirmInput && confirmBtn) {
        confirmInput.addEventListener('input', () => {
          confirmBtn.disabled = confirmInput.value.trim().toLowerCase() !== employee.email.toLowerCase();
        });
      }

      if (confirmBtn) {
        confirmBtn.addEventListener('click', async () => {
          confirmBtn.disabled = true;
          if (errorBox) {
            errorBox.style.display = 'none';
            errorBox.textContent = '';
          }

          const result = await store.deleteEmployee(employee.id, employee.id);

          if (!result.success) {
            const rule = result.error?.details?.rule || result.error?.rule || result.error?.code || '';
            let msg;
            if (rule === 'CANNOT_DELETE_SELF') {
              msg = t('employees.cannotDeleteSelf');
            } else if (rule === 'CANNOT_DELETE_LAST_ADMIN') {
              msg = t('employees.cannotDeleteLastAdmin');
            } else {
              msg = result.error?.message || t('employees.deleteFailed');
            }

            if (errorBox) {
              errorBox.textContent = msg;
              errorBox.style.display = 'block';
            }
            showToast(msg, 'error');
            confirmBtn.disabled = false;
            return;
          }

          closeModal();
          showToast(t('employees.deleteSuccess'), 'success');

          // Re-render the employees table
          container.innerHTML = EmployeesPage.render();
          EmployeesPage.afterRender(container);
        });
      }
    }
  });
}

export const EmployeesPage = {
  render() {
    const currentUser = AuthService.getCurrentUser();
    const isAdmin = (currentUser?.role || '').toUpperCase() === 'ADMIN';

    if (!isAdmin) {
      return `
        <div class="empty-state" style="padding: 64px 24px; text-align: center;">
          <h2>${escapeHtml(t('employees.accessRestricted') || 'Access Restricted')}</h2>
          <p class="text-muted">${escapeHtml(t('employees.adminOnlyMessage') || 'This page is only available to administrators.')}</p>
        </div>
      `;
    }

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
      actionsHtml: `
        <button type="button" class="btn btn-primary" id="add-employee-btn">
          ${escapeHtml(t('employees.addEmployee'))}
        </button>
      `
    });

    const rowsHtml = filtered.map(e => {
      const isSelf = e.id === currentUser?.id;
      const online = isEmployeeOnline(e.lastActive);
      const lastSeenText = formatLastSeen(e.lastActive, t);

      return `
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
        <td>
          <span class="online-indicator ${online ? 'online' : 'offline'}">
            <span class="online-dot"></span>
            <span>${escapeHtml(lastSeenText)}</span>
          </span>
        </td>
        <td>
          ${isSelf ? '' : `
            <button type="button" class="btn btn-danger btn-sm btn-delete-employee" data-employee-id="${escapeHtml(e.id)}" title="${escapeHtml(t('common.delete'))}">
              ${icons.trash('w-4 h-4')}
            </button>
          `}
        </td>
      </tr>
    `;
    }).join('');

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
                <th>${escapeHtml(t('employees.table.online'))}</th>
                <th>${escapeHtml(t('employees.table.actions'))}</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml || `<tr><td colspan="9" class="text-center text-muted p-lg">${escapeHtml(t('common.noData'))}</td></tr>`}
            </tbody>
          </table>
        </div>
      </div>
    `;
  },

  afterRender(container) {
    // Setup live polling every 30 seconds to refresh online status & employee list
    if (employeePollingTimer) {
      clearInterval(employeePollingTimer);
      employeePollingTimer = null;
    }

    employeePollingTimer = setInterval(async () => {
      if (!container || !container.isConnected) {
        if (employeePollingTimer) {
          clearInterval(employeePollingTimer);
          employeePollingTimer = null;
        }
        return;
      }
      await store.refreshEmployees();
      if (container && container.isConnected) {
        container.innerHTML = EmployeesPage.render();
        EmployeesPage.afterRender(container);
      }
    }, 30000);

    const addEmployeeBtn = container.querySelector('#add-employee-btn');
    if (!addEmployeeBtn) return;

    addEmployeeBtn.addEventListener('click', () => {
      openModal({
        title: t('employees.addEmployee'),
        contentHtml: `
          <form id="new-employee-form" class="d-flex flex-column gap-md">
            <div class="form-group">
              <label class="form-label" for="new-emp-name">${escapeHtml(t('employees.table.name'))} *</label>
              <input type="text" id="new-emp-name" class="form-control" required />
            </div>
            <div class="form-group">
              <label class="form-label" for="new-emp-email">${escapeHtml(t('employees.table.email'))} *</label>
              <input type="email" id="new-emp-email" class="form-control ltr-field" required />
            </div>
            <div class="form-grid-2">
              <div class="form-group">
                <label class="form-label" for="new-emp-role">${escapeHtml(t('employees.table.role'))} *</label>
                <select id="new-emp-role" class="form-control" required>
                  <option value="AGENT">${escapeHtml(t('employees.roles.agent'))}</option>
                  <option value="ADMIN">${escapeHtml(t('employees.roles.admin'))}</option>
                  <option value="TICKET_ONLY">${escapeHtml(t('employees.roles.ticketOnly'))}</option>
                </select>
              </div>
              <div class="form-group">
                <label class="form-label" for="new-emp-title">${escapeHtml(t('employees.titleLabel'))}</label>
                <input type="text" id="new-emp-title" class="form-control" />
              </div>
            </div>
            <div class="form-group">
              <label class="form-label" for="new-emp-password">${escapeHtml(t('employees.password'))} *</label>
              <div class="d-flex gap-sm">
                <input type="password" id="new-emp-password" class="form-control ltr-field" minlength="8" required />
                <button type="button" class="btn btn-secondary" id="generate-emp-password">${escapeHtml(t('employees.generate'))}</button>
                <button type="button" class="btn btn-secondary" id="toggle-emp-password">${escapeHtml(t('employees.show'))}</button>
              </div>
            </div>
          </form>
        `,
        footerHtml: `
          <button type="button" class="btn btn-secondary" id="cancel-new-employee">${escapeHtml(t('common.cancel'))}</button>
          <button type="button" class="btn btn-primary" id="submit-new-employee">${escapeHtml(t('common.save'))}</button>
        `,
        onOpen: (modalEl) => {
          const passwordInput = modalEl.querySelector('#new-emp-password');
          const togglePasswordBtn = modalEl.querySelector('#toggle-emp-password');
          modalEl.querySelector('#cancel-new-employee')?.addEventListener('click', closeModal);
          modalEl.querySelector('#generate-emp-password')?.addEventListener('click', () => {
            passwordInput.value = crypto.randomUUID().replace(/-/g, '').slice(0, 12);
            passwordInput.type = 'text';
            togglePasswordBtn.textContent = t('employees.hide');
          });
          togglePasswordBtn?.addEventListener('click', () => {
            passwordInput.type = passwordInput.type === 'password' ? 'text' : 'password';
            togglePasswordBtn.textContent = passwordInput.type === 'password' ? t('employees.show') : t('employees.hide');
          });

          const submitBtn = modalEl.querySelector('#submit-new-employee');
          submitBtn?.addEventListener('click', async () => {
            const name = modalEl.querySelector('#new-emp-name').value.trim();
            const email = modalEl.querySelector('#new-emp-email').value.trim();
            const role = modalEl.querySelector('#new-emp-role').value;
            const title = modalEl.querySelector('#new-emp-title').value.trim();
            const password = passwordInput.value;
            if (!name || !email || !password) {
              showToast(t('validation.requiredField'), 'error');
              return;
            }
            if (password.length < 8) {
              showToast(t('employees.passwordTooShort'), 'error');
              return;
            }
            submitBtn.disabled = true;
            const result = await store.addEmployee({ name, email, role, title, password, status: 'ACTIVE' });
            submitBtn.disabled = false;
            if (!result.success) {
              showToast(result.error?.message || t('employees.createFailed'), 'error');
              return;
            }
            closeModal();
            showEmployeeCreatedConfirmation(email, password);
          });
        }
      });
    });

    // Bind delete buttons
    const { employees } = store.getState();
    container.querySelectorAll('.btn-delete-employee').forEach(btn => {
      btn.addEventListener('click', () => {
        const employeeId = btn.dataset.employeeId;
        const employee = employees.find(e => e.id === employeeId);
        if (employee) {
          openDeleteEmployeeModal(employee, container);
        }
      });
    });
  }
};

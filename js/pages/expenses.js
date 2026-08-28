/**
 * AfricaTravel — Office Expenses Management Page (Services & Transfers)
 */

import { ExpenseService } from '../services/expense-service.js';
import { AuthService } from '../services/auth-service.js';
import { icons } from '../components/icons.js';
import { renderPageHeader } from '../components/page-header.js';
import { openModal, closeModal } from '../components/modal.js';
import { showToast } from '../components/toast.js';
import { formatCurrency, formatDateTime } from '../utils/calculations.js';
import { escapeHtml } from '../utils/security.js';
import { t } from '../i18n/i18n.js';

let currentFilters = {
  category: '',
  startDate: '',
  endDate: '',
  page: 1,
  pageSize: 25
};

let cachedExpenses = [];
let cachedPagination = { page: 1, pageSize: 25, total: 0, totalPages: 1 };
let isInitialLoaded = false;

function getCategoryBadge(category) {
  const isServices = category === 'SERVICES';
  const label = isServices ? (t('expenses.categories.SERVICES') || 'Services') : (t('expenses.categories.TRANSFERS') || 'Transfers');
  const bgClass = isServices ? 'badge-primary' : 'badge-accent';
  return `<span class="badge ${bgClass}">${escapeHtml(label)}</span>`;
}

function openAddExpenseModal(onSuccess) {
  const now = new Date();
  // Format for datetime-local input YYYY-MM-DDTHH:mm
  const localIsoDate = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);

  openModal({
    title: t('expenses.newExpenseModalTitle'),
    subtitle: t('expenses.newExpenseModalSubtitle'),
    contentHtml: `
      <form id="new-expense-form" class="d-flex flex-column gap-md">
        <div class="form-grid-2">
          <div class="form-group">
            <label class="form-label" for="new-exp-category">${escapeHtml(t('expenses.form.category'))} *</label>
            <select id="new-exp-category" class="form-control" required>
              <option value="SERVICES">${escapeHtml(t('expenses.categories.SERVICES'))} (Services)</option>
              <option value="TRANSFERS">${escapeHtml(t('expenses.categories.TRANSFERS'))} (Transfers)</option>
            </select>
          </div>

          <div class="form-group">
            <label class="form-label" for="new-exp-amount">${escapeHtml(t('expenses.form.amount'))} *</label>
            <input type="number" id="new-exp-amount" class="form-control tabular-nums" min="0.01" step="any" placeholder="0.00" required />
          </div>
        </div>

        <div class="form-group">
          <label class="form-label" for="new-exp-date">${escapeHtml(t('expenses.form.date'))} *</label>
          <input type="datetime-local" id="new-exp-date" class="form-control ltr-field" value="${localIsoDate}" required />
        </div>

        <div class="form-group">
          <label class="form-label" for="new-exp-desc">${escapeHtml(t('expenses.form.description'))} *</label>
          <textarea id="new-exp-desc" class="form-control" rows="3" placeholder="${escapeHtml(t('expenses.form.descriptionPlaceholder'))}" required></textarea>
        </div>

        <div id="new-exp-error-box" class="p-sm text-sm text-danger" style="display: none; background-color: rgba(239, 68, 68, 0.1); border-radius: var(--radius-md); border: 1px solid rgba(239, 68, 68, 0.3);"></div>
      </form>
    `,
    footerHtml: `
      <button type="button" class="btn btn-secondary" id="cancel-new-expense">${escapeHtml(t('common.cancel'))}</button>
      <button type="button" class="btn btn-primary" id="submit-new-expense">${escapeHtml(t('common.save'))}</button>
    `,
    onOpen: (modalEl) => {
      const cancelBtn = modalEl.querySelector('#cancel-new-expense');
      const submitBtn = modalEl.querySelector('#submit-new-expense');
      const errorBox = modalEl.querySelector('#new-exp-error-box');

      if (cancelBtn) cancelBtn.addEventListener('click', closeModal);

      if (submitBtn) {
        submitBtn.addEventListener('click', async () => {
          const category = modalEl.querySelector('#new-exp-category').value;
          const amount = Number(modalEl.querySelector('#new-exp-amount').value);
          const date = modalEl.querySelector('#new-exp-date').value;
          const description = modalEl.querySelector('#new-exp-desc').value.trim();

          if (!amount || amount <= 0) {
            showToast(t('validation.requiredField') || 'Valid amount is required', 'error');
            return;
          }
          if (!description) {
            showToast(t('validation.requiredField') || 'Description is required', 'error');
            return;
          }
          if (!date) {
            showToast(t('validation.requiredField') || 'Date is required', 'error');
            return;
          }

          submitBtn.disabled = true;
          if (errorBox) {
            errorBox.style.display = 'none';
            errorBox.textContent = '';
          }

          const result = await ExpenseService.createExpense({
            category,
            amount,
            currency: 'EGP',
            date,
            description
          });

          submitBtn.disabled = false;

          if (!result.success) {
            const msg = result.error?.message || t('common.error');
            if (errorBox) {
              errorBox.textContent = msg;
              errorBox.style.display = 'block';
            }
            showToast(msg, 'error');
            return;
          }

          closeModal();
          showToast(t('expenses.createdSuccessfully'), 'success');
          if (onSuccess) onSuccess();
        });
      }
    }
  });
}

function openDeleteExpenseModal(expense, onSuccess) {
  openModal({
    title: t('expenses.deleteConfirmTitle'),
    subtitle: `${formatCurrency(expense.amount, expense.currency || 'EGP')} — ${expense.description}`,
    contentHtml: `
      <div class="d-flex flex-column gap-md">
        <p class="text-muted" style="margin: 0; line-height: 1.5;">
          ${escapeHtml(t('expenses.deleteConfirmMessage'))}
        </p>
      </div>
    `,
    footerHtml: `
      <button type="button" class="btn btn-secondary" id="modal-cancel-delete-exp">${escapeHtml(t('common.cancel'))}</button>
      <button type="button" class="btn btn-danger" id="modal-confirm-delete-exp">${escapeHtml(t('common.delete'))}</button>
    `,
    onOpen: (modalEl) => {
      const cancelBtn = modalEl.querySelector('#modal-cancel-delete-exp');
      const confirmBtn = modalEl.querySelector('#modal-confirm-delete-exp');

      if (cancelBtn) cancelBtn.addEventListener('click', closeModal);

      if (confirmBtn) {
        confirmBtn.addEventListener('click', async () => {
          confirmBtn.disabled = true;
          const result = await ExpenseService.deleteExpense(expense.id);
          confirmBtn.disabled = false;

          if (!result.success) {
            showToast(result.error?.message || t('common.error'), 'error');
            return;
          }

          closeModal();
          showToast(t('expenses.deletedSuccessfully'), 'success');
          if (onSuccess) onSuccess();
        });
      }
    }
  });
}

export const ExpensesPage = {
  render() {
    const currentUser = AuthService.getCurrentUser();
    const isAdmin = (currentUser?.role || '').toUpperCase() === 'ADMIN';
    const isAgent = (currentUser?.role || '').toUpperCase() === 'AGENT';

    if (!isAdmin && !isAgent) {
      return `
        <div class="empty-state" style="padding: 64px 24px; text-align: center;">
          <h2>${escapeHtml(t('employees.accessRestricted') || 'Access Restricted')}</h2>
          <p class="text-muted">${escapeHtml(t('employees.adminOnlyMessage') || 'This page is only available to authorized staff.')}</p>
        </div>
      `;
    }

    let servicesTotal = 0;
    let transfersTotal = 0;
    let grandTotal = 0;

    cachedExpenses.forEach(exp => {
      const amt = Number(exp.amount) || 0;
      grandTotal += amt;
      if (exp.category === 'SERVICES') servicesTotal += amt;
      if (exp.category === 'TRANSFERS') transfersTotal += amt;
    });

    const headerHtml = renderPageHeader({
      title: t('expenses.title'),
      subtitle: t('expenses.subtitle'),
      actionsHtml: `
        <button type="button" class="btn btn-primary" id="btn-add-expense">
          ${icons.plus('w-4 h-4')}
          <span>${escapeHtml(t('expenses.addExpense'))}</span>
        </button>
      `
    });

    const rowsHtml = cachedExpenses.map(exp => `
      <tr>
        <td>
          <div class="cell-main ltr-data">${formatDateTime(exp.date)}</div>
        </td>
        <td>
          ${getCategoryBadge(exp.category)}
        </td>
        <td>
          <span class="tabular-nums font-bold" style="font-size: 15px;">
            ${formatCurrency(exp.amount, exp.currency || 'EGP')}
          </span>
        </td>
        <td>
          <span class="text-sm font-medium" style="max-width: 320px; display: inline-block; word-break: break-word;">
            ${escapeHtml(exp.description)}
          </span>
        </td>
        <td>
          <div class="d-flex items-center gap-xs">
            <div class="sidebar-user-avatar" style="width: 26px; height: 26px; font-size: 11px; background-color: #2563eb;">
              ${escapeHtml((exp.createdBy || 'S').slice(0, 2).toUpperCase())}
            </div>
            <span class="text-sm text-secondary">${escapeHtml(exp.createdBy || 'Staff')}</span>
          </div>
        </td>
        ${isAdmin ? `
        <td>
          <button type="button" class="btn btn-danger btn-sm btn-delete-expense" data-expense-id="${escapeHtml(exp.id)}" title="${escapeHtml(t('common.delete'))}">
            ${icons.trash('w-4 h-4')}
          </button>
        </td>
        ` : ''}
      </tr>
    `).join('');

    return `
      ${headerHtml}

      <!-- Top KPI Summary Cards -->
      <div class="stat-card-grid mb-lg">
        <div class="stat-card">
          <span class="stat-card-label">${escapeHtml(t('expenses.totalServices'))}</span>
          <div class="stat-card-value tabular-nums">${formatCurrency(servicesTotal, 'EGP')}</div>
        </div>

        <div class="stat-card">
          <span class="stat-card-label">${escapeHtml(t('expenses.totalTransfers'))}</span>
          <div class="stat-card-value tabular-nums">${formatCurrency(transfersTotal, 'EGP')}</div>
        </div>

        <div class="stat-card">
          <span class="stat-card-label">${escapeHtml(t('expenses.grandTotal'))}</span>
          <div class="stat-card-value tabular-nums text-accent">${formatCurrency(grandTotal, 'EGP')}</div>
        </div>
      </div>

      <!-- Filters Toolbar -->
      <div class="card mb-lg" style="padding: 16px;">
        <div class="d-flex items-center justify-between gap-md flex-wrap">
          <div class="d-flex items-center gap-md flex-wrap" style="flex: 1;">
            <div style="min-width: 180px;">
              <select id="exp-filter-category" class="form-control">
                <option value="">${escapeHtml(t('expenses.filterCategory'))}</option>
                <option value="SERVICES" ${currentFilters.category === 'SERVICES' ? 'selected' : ''}>${escapeHtml(t('expenses.categories.SERVICES'))}</option>
                <option value="TRANSFERS" ${currentFilters.category === 'TRANSFERS' ? 'selected' : ''}>${escapeHtml(t('expenses.categories.TRANSFERS'))}</option>
              </select>
            </div>

            <div class="d-flex items-center gap-xs">
              <input type="date" id="exp-filter-start-date" class="form-control" value="${escapeHtml(currentFilters.startDate || '')}" placeholder="From Date" />
              <span class="text-muted">—</span>
              <input type="date" id="exp-filter-end-date" class="form-control" value="${escapeHtml(currentFilters.endDate || '')}" placeholder="To Date" />
            </div>

            <button type="button" class="btn btn-secondary btn-sm" id="exp-filter-clear">
              ${escapeHtml(t('common.filter'))}
            </button>
          </div>
        </div>
      </div>

      <!-- Expenses Data Table -->
      <div class="card">
        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>${escapeHtml(t('expenses.table.date'))}</th>
                <th>${escapeHtml(t('expenses.table.category'))}</th>
                <th>${escapeHtml(t('expenses.table.amount'))}</th>
                <th>${escapeHtml(t('expenses.table.description'))}</th>
                <th>${escapeHtml(t('expenses.table.recordedBy'))}</th>
                ${isAdmin ? `<th>${escapeHtml(t('expenses.table.actions'))}</th>` : ''}
              </tr>
            </thead>
            <tbody id="expenses-table-body">
              ${rowsHtml || `<tr><td colspan="${isAdmin ? 6 : 5}" class="text-center text-muted p-lg">${escapeHtml(t('expenses.emptyState'))}</td></tr>`}
            </tbody>
          </table>
        </div>

        <!-- Pagination Controls -->
        ${cachedPagination.totalPages > 1 ? `
        <div class="card-footer d-flex items-center justify-between p-md" style="border-top: 1px solid var(--color-border-soft);">
          <span class="text-sm text-muted">
            Page ${cachedPagination.page} of ${cachedPagination.totalPages} (${cachedPagination.total} records)
          </span>
          <div class="d-flex gap-xs">
            <button type="button" class="btn btn-secondary btn-sm" id="exp-page-prev" ${cachedPagination.page <= 1 ? 'disabled' : ''}>‹ Prev</button>
            <button type="button" class="btn btn-secondary btn-sm" id="exp-page-next" ${cachedPagination.page >= cachedPagination.totalPages ? 'disabled' : ''}>Next ›</button>
          </div>
        </div>
        ` : ''}
      </div>
    `;
  },

  async afterRender(container) {
    const fetchAndRefresh = async () => {
      const res = await ExpenseService.getExpenses(currentFilters);
      if (res.success && Array.isArray(res.data)) {
        cachedExpenses = res.data;
        if (res.pagination) cachedPagination = res.pagination;
      }
      isInitialLoaded = true;
      container.innerHTML = ExpensesPage.render();
      ExpensesPage.afterRender(container);
    };

    if (!isInitialLoaded) {
      await fetchAndRefresh();
      return;
    }

    // Add Expense Button
    const addBtn = container.querySelector('#btn-add-expense');
    if (addBtn) {
      addBtn.addEventListener('click', () => {
        openAddExpenseModal(() => {
          fetchAndRefresh();
        });
      });
    }

    // Category Filter Change
    const catSelect = container.querySelector('#exp-filter-category');
    if (catSelect) {
      catSelect.addEventListener('change', (e) => {
        currentFilters.category = e.target.value;
        currentFilters.page = 1;
        fetchAndRefresh();
      });
    }

    // Date Filters
    const startDateInput = container.querySelector('#exp-filter-start-date');
    const endDateInput = container.querySelector('#exp-filter-end-date');
    const filterClearBtn = container.querySelector('#exp-filter-clear');

    if (startDateInput) {
      startDateInput.addEventListener('change', (e) => {
        currentFilters.startDate = e.target.value;
        currentFilters.page = 1;
        fetchAndRefresh();
      });
    }

    if (endDateInput) {
      endDateInput.addEventListener('change', (e) => {
        currentFilters.endDate = e.target.value;
        currentFilters.page = 1;
        fetchAndRefresh();
      });
    }

    if (filterClearBtn) {
      filterClearBtn.addEventListener('click', () => {
        currentFilters.category = '';
        currentFilters.startDate = '';
        currentFilters.endDate = '';
        currentFilters.page = 1;
        fetchAndRefresh();
      });
    }

    // Pagination
    const prevBtn = container.querySelector('#exp-page-prev');
    const nextBtn = container.querySelector('#exp-page-next');
    if (prevBtn) {
      prevBtn.addEventListener('click', () => {
        if (currentFilters.page > 1) {
          currentFilters.page--;
          fetchAndRefresh();
        }
      });
    }
    if (nextBtn) {
      nextBtn.addEventListener('click', () => {
        if (currentFilters.page < cachedPagination.totalPages) {
          currentFilters.page++;
          fetchAndRefresh();
        }
      });
    }

    // Delete Buttons (Admin only)
    container.querySelectorAll('.btn-delete-expense').forEach(btn => {
      btn.addEventListener('click', () => {
        const expenseId = btn.dataset.expenseId;
        const exp = cachedExpenses.find(e => e.id === expenseId);
        if (exp) {
          openDeleteExpenseModal(exp, () => {
            fetchAndRefresh();
          });
        }
      });
    });
  }
};

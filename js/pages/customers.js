/**
 * AfricaTravel — Customers CRM Page
 */

import { CustomerService } from '../services/customer-service.js';
import { icons } from '../components/icons.js';
import { renderPageHeader } from '../components/page-header.js';
import { openModal, closeModal } from '../components/modal.js';
import { showToast } from '../components/toast.js';
import { formatCurrency } from '../utils/calculations.js';
import { escapeHtml } from '../utils/security.js';
import { t } from '../i18n/i18n.js';

let searchQuery = '';

function renderCustomerRows(customers) {
  if (customers.length === 0) {
    return `<tr><td colspan="7" class="text-center text-muted p-lg">${escapeHtml(t('customers.empty.description'))}</td></tr>`;
  }

  return customers.map(c => {
    const stats = CustomerService.getCustomerStats(c.id);
    const initials = (c.name || 'C').split(' ').map(n => n[0]).filter(Boolean).join('').substring(0, 2).toUpperCase() || 'C';

    return `
      <tr>
        <td>
          <div class="d-flex items-center gap-sm">
            <div class="sidebar-user-avatar" style="width: 36px; height: 36px; font-size: 13px; background-color: ${c.isVip ? '#854d0e' : '#2563eb'};">
              ${escapeHtml(initials)}
            </div>
            <div>
              <a href="/customers/${escapeHtml(c.id)}" class="cell-main" data-link>
                ${escapeHtml(c.name)}
                ${c.isVip ? '<span class="badge badge-vip ms-xs">VIP</span>' : ''}
              </a>
              <div class="cell-sub ltr-data">${escapeHtml(c.id)}</div>
            </div>
          </div>
        </td>
        <td>
          <div class="cell-main ltr-data">${escapeHtml(c.phone || '--')}</div>
          <div class="cell-sub ltr-data">${escapeHtml(c.email || '--')}</div>
        </td>
        <td>
          <div class="tabular-nums font-medium ltr-data">${escapeHtml(c.passport || '--')}</div>
        </td>
        <td>
          <span class="text-sm">${escapeHtml(c.nationality || '--')}</span>
        </td>
        <td>
          <span class="tabular-nums font-bold" style="font-size: 15px;">${stats.ticketCount}</span>
        </td>
        <td>
          <div class="tabular-nums font-bold">${formatCurrency(stats.totalSpent, 'EGP')}</div>
          <div class="cell-sub text-success">${escapeHtml(t('common.paid'))}: ${formatCurrency(stats.totalPaid, 'EGP')}</div>
        </td>
        <td>
          <a href="/customers/${escapeHtml(c.id)}" class="btn btn-sm btn-ghost text-accent" data-link>
            ${escapeHtml(t('common.details'))} ›
          </a>
        </td>
      </tr>
    `;
  }).join('');
}

function renderCustomerCards(customers) {
  if (customers.length === 0) {
    return `<div class="text-center text-muted p-md">${escapeHtml(t('customers.empty.description'))}</div>`;
  }

  return customers.map(c => {
    const stats = CustomerService.getCustomerStats(c.id);

    return `
      <a href="/customers/${escapeHtml(c.id)}" class="mobile-data-card" data-link>
        <div class="mobile-card-top">
          <span class="mobile-card-id">${escapeHtml(c.name)}</span>
          ${c.isVip ? '<span class="badge badge-vip">VIP</span>' : '<span class="badge badge-neutral">Client</span>'}
        </div>
        <div class="text-sm text-muted ltr-data">
          ${escapeHtml(c.phone || '')} • ${escapeHtml(c.email || '')}
        </div>
        <div class="mobile-card-meta">
          <div>
            <div class="text-xs text-muted">${escapeHtml(t('customerDetails.totalTickets'))} / ${escapeHtml(t('customerDetails.totalSpent'))}</div>
            <div class="font-bold tabular-nums">${stats.ticketCount} • ${formatCurrency(stats.totalSpent, 'EGP')}</div>
          </div>
          <span class="text-accent font-semibold text-sm">${escapeHtml(t('common.details'))} ›</span>
        </div>
      </a>
    `;
  }).join('');
}

export const CustomersPage = {
  render(params, query) {
    if (query && query.q) {
      searchQuery = query.q;
    }

    const customers = CustomerService.searchCustomers(searchQuery);

    const headerHtml = renderPageHeader({
      title: t('customers.title'),
      subtitle: t('customers.subtitle'),
      actionsHtml: `
        <button type="button" class="btn btn-primary" id="create-customer-btn">
          ${icons.plus('w-4 h-4')}
          <span>${escapeHtml(t('customers.newCustomer'))}</span>
        </button>
      `
    });

    return `
      ${headerHtml}

      <!-- Search & Filter Bar -->
      <div class="filter-bar">
        <div class="view-search-box flex-1">
          ${icons.search()}
          <input
            type="search"
            class="form-control"
            id="customer-search-input"
            placeholder="${escapeHtml(t('customers.searchPlaceholder'))}"
            value="${escapeHtml(searchQuery)}"
            autocomplete="off"
          />
        </div>
      </div>

      <div class="card" id="customers-card-container">
        <!-- Desktop Table -->
        <div class="table-responsive desktop-table-view">
          <table class="data-table">
            <thead>
              <tr>
                <th>${escapeHtml(t('customers.table.name'))}</th>
                <th>${escapeHtml(t('customers.table.phone'))} & ${escapeHtml(t('customers.table.email'))}</th>
                <th>${escapeHtml(t('customers.table.passport'))}</th>
                <th>${escapeHtml(t('customerDetails.nationality'))}</th>
                <th>${escapeHtml(t('customers.table.activeTickets'))}</th>
                <th>${escapeHtml(t('customers.table.totalSpent'))}</th>
                <th>${escapeHtml(t('customers.table.actions'))}</th>
              </tr>
            </thead>
            <tbody id="customers-table-tbody">
              ${renderCustomerRows(customers)}
            </tbody>
          </table>
        </div>

        <!-- Mobile Cards -->
        <div class="mobile-card-list mobile-card-view p-sm" style="display: none;">
          ${renderCustomerCards(customers)}
        </div>
      </div>
    `;
  },

  afterRender(container) {
    const searchInput = container.querySelector('#customer-search-input');
    const tableTbody = container.querySelector('#customers-table-tbody');
    const createBtn = container.querySelector('#create-customer-btn');

    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value;
        const results = CustomerService.searchCustomers(searchQuery);
        if (tableTbody) {
          tableTbody.innerHTML = renderCustomerRows(results);
        }
      });
    }

    if (createBtn) {
      createBtn.addEventListener('click', () => {
        openModal({
          title: t('customers.newCustomer'),
          subtitle: t('ticketCreate.passengerInfo.subtitle'),
          contentHtml: `
            <form id="new-cust-modal-form" class="d-flex flex-column gap-md">
              <div class="form-group">
                <label class="form-label" for="new-cust-name">${escapeHtml(t('ticketCreate.passengerInfo.passengerName'))} *</label>
                <input type="text" id="new-cust-name" class="form-control" required />
              </div>
              <div class="form-grid-2">
                <div class="form-group">
                  <label class="form-label" for="new-cust-phone">${escapeHtml(t('ticketCreate.passengerInfo.phone'))}</label>
                  <input type="tel" id="new-cust-phone" class="form-control ltr-field" />
                </div>
                <div class="form-group">
                  <label class="form-label" for="new-cust-email">${escapeHtml(t('ticketCreate.passengerInfo.email'))}</label>
                  <input type="email" id="new-cust-email" class="form-control ltr-field" />
                </div>
              </div>
              <div class="form-grid-2">
                <div class="form-group">
                  <label class="form-label" for="new-cust-passport">${escapeHtml(t('ticketCreate.passengerInfo.passport'))} *</label>
                  <input type="text" id="new-cust-passport" class="form-control ltr-field" required />
                </div>
                <div class="form-group">
                  <label class="form-label" for="new-cust-nationality">${escapeHtml(t('customerDetails.nationality'))}</label>
                  <input type="text" id="new-cust-nationality" class="form-control" value="Egyptian" />
                </div>
              </div>
            </form>
          `,
          footerHtml: `
            <button type="button" class="btn btn-secondary" id="cancel-new-cust">${escapeHtml(t('common.cancel'))}</button>
            <button type="button" class="btn btn-primary" id="submit-new-cust">${escapeHtml(t('common.save'))}</button>
          `,
          onOpen: (modalEl) => {
            const cancel = modalEl.querySelector('#cancel-new-cust');
            const submit = modalEl.querySelector('#submit-new-cust');
            if (cancel) cancel.addEventListener('click', closeModal);
            if (submit) {
              submit.addEventListener('click', () => {
                const name = modalEl.querySelector('#new-cust-name').value.trim();
                const passport = modalEl.querySelector('#new-cust-passport').value.trim();
                if (!name || !passport) {
                  showToast(t('validation.requiredField'), 'error');
                  return;
                }
                const newC = CustomerService.createCustomer({
                  name,
                  passport,
                  phone: modalEl.querySelector('#new-cust-phone').value.trim(),
                  email: modalEl.querySelector('#new-cust-email').value.trim(),
                  nationality: modalEl.querySelector('#new-cust-nationality').value.trim()
                });
                closeModal();
                showToast(t('toasts.customerCreated'), 'success');
                window.history.pushState(null, null, `/customers/${newC.id}`);
                window.dispatchEvent(new PopStateEvent('popstate'));
              });
            }
          }
        });
      });
    }
  }
};

/**
 * AfriciaTravel — Customers CRM Page
 */

import { store } from '../state/store.js';
import { CustomerService } from '../services/customer-service.js';
import { icons } from '../components/icons.js';
import { renderPageHeader } from '../components/page-header.js';
import { renderStatusBadge } from '../components/status-badge.js';
import { openModal, closeModal } from '../components/modal.js';
import { showToast } from '../components/toast.js';
import { formatCurrency } from '../utils/calculations.js';

let searchQuery = '';

function renderCustomerRows(customers) {
  if (customers.length === 0) {
    return '<tr><td colspan="7" class="text-center text-muted p-lg">No customer records found.</td></tr>';
  }

  return customers.map(c => {
    const stats = CustomerService.getCustomerStats(c.id);
    const initials = c.name.split(' ').map(n => n[0]).filter(Boolean).join('').substring(0, 2).toUpperCase() || 'C';

    return `
      <tr>
        <td>
          <div class="d-flex items-center gap-sm">
            <div class="sidebar-user-avatar" style="width: 36px; height: 36px; font-size: 13px; background-color: ${c.isVip ? '#854d0e' : '#2563eb'};">
              ${initials}
            </div>
            <div>
              <a href="/customers/${c.id}" class="cell-main" data-link>
                ${c.name}
                ${c.isVip ? '<span class="badge badge-vip ml-xs">VIP</span>' : ''}
              </a>
              <div class="cell-sub">${c.id} • Member since ${c.memberSince}</div>
            </div>
          </div>
        </td>
        <td>
          <div class="cell-main">${c.phone || '—'}</div>
          <div class="cell-sub">${c.email || '—'}</div>
        </td>
        <td>
          <div class="tabular-nums font-medium">${c.passport || '—'}</div>
        </td>
        <td>
          <span class="text-sm">${c.nationality || '—'}</span>
        </td>
        <td>
          <span class="tabular-nums font-bold" style="font-size: 15px;">${stats.ticketCount}</span>
        </td>
        <td>
          <div class="tabular-nums font-bold">${formatCurrency(stats.totalSpent, 'EGP')}</div>
          <div class="cell-sub text-success">Paid: ${formatCurrency(stats.totalPaid, 'EGP')}</div>
        </td>
        <td>
          <a href="/customers/${c.id}" class="btn btn-sm btn-ghost text-accent" data-link>
            View Profile ›
          </a>
        </td>
      </tr>
    `;
  }).join('');
}

function renderCustomerCards(customers) {
  if (customers.length === 0) {
    return '<div class="text-center text-muted p-md">No customer records found.</div>';
  }

  return customers.map(c => {
    const stats = CustomerService.getCustomerStats(c.id);

    return `
      <a href="/customers/${c.id}" class="mobile-data-card" data-link>
        <div class="mobile-card-top">
          <span class="mobile-card-id">${c.name}</span>
          ${c.isVip ? '<span class="badge badge-vip">VIP</span>' : '<span class="badge badge-neutral">Client</span>'}
        </div>
        <div class="text-sm text-muted">
          ${c.phone} • ${c.email}
        </div>
        <div class="mobile-card-meta">
          <div>
            <div class="text-xs text-muted">Tickets / Spent</div>
            <div class="font-bold tabular-nums">${stats.ticketCount} tickets • ${formatCurrency(stats.totalSpent, 'EGP')}</div>
          </div>
          <span class="text-accent font-semibold text-sm">Profile ›</span>
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

    const customers = CustomerService.getAllCustomers(searchQuery);

    const headerHtml = renderPageHeader({
      title: 'Customers',
      subtitle: 'Client profiles, lifetime travel history, and account summaries.',
      actionsHtml: `
        <button type="button" class="btn btn-primary" id="page-new-customer-btn">
          ${icons.plus('w-4 h-4')}
          <span>Add Customer</span>
        </button>
      `
    });

    return `
      ${headerHtml}

      <!-- Search Bar -->
      <div class="filter-bar">
        <div class="view-search-box flex-1">
          ${icons.search()}
          <input
            type="search"
            class="form-control"
            id="cust-search-input"
            placeholder="Search customers by name, email, phone, or passport..."
            value="${searchQuery}"
            autocomplete="off"
          />
        </div>
      </div>

      <!-- Customers Table -->
      <div class="card" id="customers-card-container">
        <div class="table-responsive desktop-table-view">
          <table class="data-table">
            <thead>
              <tr>
                <th>CUSTOMER</th>
                <th>CONTACT</th>
                <th>PASSPORT</th>
                <th>NATIONALITY</th>
                <th>TICKETS</th>
                <th>TOTAL SPENT</th>
                <th>ACTIONS</th>
              </tr>
            </thead>
            <tbody id="customers-table-tbody">
              ${renderCustomerRows(customers)}
            </tbody>
          </table>
        </div>

        <div class="mobile-card-list mobile-card-view p-sm" id="customers-mobile-list" style="display: none;">
          ${renderCustomerCards(customers)}
        </div>
      </div>
    `;
  },

  afterRender(container) {
    const searchInput = container.querySelector('#cust-search-input');
    const addBtn = container.querySelector('#page-new-customer-btn');
    const tbody = container.querySelector('#customers-table-tbody');
    const mobileList = container.querySelector('#customers-mobile-list');

    const updateResults = () => {
      const customers = CustomerService.getAllCustomers(searchQuery);
      if (tbody) tbody.innerHTML = renderCustomerRows(customers);
      if (mobileList) mobileList.innerHTML = renderCustomerCards(customers);
    };

    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value;
        updateResults();
      });
    }

    if (addBtn) {
      addBtn.addEventListener('click', () => {
        openModal({
          title: 'Add New Customer',
          subtitle: 'Create customer profile in CRM directory',
          contentHtml: `
            <div class="d-flex flex-column gap-md">
              <div class="form-group">
                <label class="form-label" for="new-cust-fullname">Full Legal Name *</label>
                <input type="text" id="new-cust-fullname" class="form-control" placeholder="e.g. Mohamed Ali" required />
              </div>

              <div class="form-grid-2">
                <div class="form-group">
                  <label class="form-label" for="new-cust-email">Email Address</label>
                  <input type="email" id="new-cust-email" class="form-control" placeholder="client@example.com" />
                </div>
                <div class="form-group">
                  <label class="form-label" for="new-cust-phone">Phone Number *</label>
                  <input type="tel" id="new-cust-phone" class="form-control" placeholder="+20 100 000 0000" required />
                </div>
              </div>

              <div class="form-grid-2">
                <div class="form-group">
                  <label class="form-label" for="new-cust-passport">Passport Number *</label>
                  <input type="text" id="new-cust-passport" class="form-control" placeholder="e.g. A99887766" required />
                </div>
                <div class="form-group">
                  <label class="form-label" for="new-cust-nationality">Nationality</label>
                  <select id="new-cust-nationality" class="form-control">
                    <option value="Egyptian (EGY)">Egyptian (EGY)</option>
                    <option value="American (USA)">American (USA)</option>
                    <option value="British (GBR)">British (GBR)</option>
                    <option value="Saudi (SAU)">Saudi (SAU)</option>
                    <option value="Emirati (UAE)">Emirati (UAE)</option>
                  </select>
                </div>
              </div>

              <div class="form-group">
                <label class="d-flex items-center gap-xs text-sm" style="cursor: pointer;">
                  <input type="checkbox" id="new-cust-vip" />
                  <span>Mark as VIP Customer</span>
                </label>
              </div>

              <div class="form-group">
                <label class="form-label" for="new-cust-initial-note">Initial Profile Notes</label>
                <textarea id="new-cust-initial-note" class="form-control" placeholder="Preferences, frequent flyer accounts, or corporate notes..."></textarea>
              </div>
            </div>
          `,
          footerHtml: `
            <button type="button" class="btn btn-secondary" id="cust-modal-cancel">Cancel</button>
            <button type="button" class="btn btn-primary" id="cust-modal-submit">Create Customer</button>
          `,
          onOpen: (modalEl) => {
            const cancelBtn = modalEl.querySelector('#cust-modal-cancel');
            const submitBtn = modalEl.querySelector('#cust-modal-submit');

            if (cancelBtn) cancelBtn.addEventListener('click', closeModal);

            if (submitBtn) {
              submitBtn.addEventListener('click', () => {
                const name = modalEl.querySelector('#new-cust-fullname').value.trim();
                const phone = modalEl.querySelector('#new-cust-phone').value.trim();
                const passport = modalEl.querySelector('#new-cust-passport').value.trim();

                if (!name || !phone || !passport) {
                  showToast('Please fill all required fields (Name, Phone, Passport)', 'error');
                  return;
                }

                const newC = store.createCustomer({
                  name,
                  email: modalEl.querySelector('#new-cust-email').value.trim(),
                  phone,
                  passport,
                  nationality: modalEl.querySelector('#new-cust-nationality').value,
                  isVip: modalEl.querySelector('#new-cust-vip').checked,
                  initialNote: modalEl.querySelector('#new-cust-initial-note').value.trim()
                });

                closeModal();
                showToast(`Customer ${newC.name} created!`, 'success');
                container.innerHTML = CustomersPage.render();
                CustomersPage.afterRender(container);
              });
            }
          }
        });
      });
    }
  }
};

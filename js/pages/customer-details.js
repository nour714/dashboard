/**
 * AfricaTravel — Customer Details Page
 */

import { CustomerService } from '../services/customer-service.js';
import { icons } from '../components/icons.js';
import { renderStatusBadge } from '../components/status-badge.js';
import { renderTabs, bindTabs } from '../components/tabs.js';
import { openModal, closeModal } from '../components/modal.js';
import { showToast } from '../components/toast.js';
import {
  calculateTotalPaid,
  calculateRemaining,
  formatCurrency,
  formatDate,
  formatDateTime
} from '../utils/calculations.js';
import { escapeHtml } from '../utils/security.js';
import { t } from '../i18n/i18n.js';

export const CustomerDetailsPage = {
  render(params, activeTab = 'tickets') {
    const customerId = params.id;
    const customer = CustomerService.getCustomerById(customerId);

    if (!customer) {
      return `
        <div class="empty-state" style="margin-top: 60px;">
          <div class="empty-state-title">${escapeHtml(t('validation.customerNotFound'))}</div>
          <p class="empty-state-desc">The customer profile "${escapeHtml(customerId)}" does not exist.</p>
          <a href="/customers" class="btn btn-primary" data-link>${escapeHtml(t('customerDetails.backToCustomers'))}</a>
        </div>
      `;
    }

    const stats = CustomerService.getCustomerStats(customerId);

    const tabs = [
      { id: 'tickets', label: t('customerDetails.bookingHistory'), badge: stats.tickets.length },
      { id: 'payments', label: t('nav.payments') },
      { id: 'refunds', label: t('nav.refunds') },
      { id: 'notes', label: t('customerDetails.notes'), badge: (customer.notes || []).length }
    ];

    const ticketRows = stats.tickets.map(tData => {
      const totalPaid = calculateTotalPaid(tData.payments);
      const remaining = calculateRemaining(tData.ticketPrice, totalPaid);

      return `
        <tr>
          <td><strong class="airline-code-badge ltr-data">${escapeHtml(tData.pnr)}</strong></td>
          <td>
            <div class="font-semibold ltr-data">${escapeHtml(tData.origin)} ✈ ${escapeHtml(tData.destination)}</div>
            <div class="cell-sub"><span class="ltr-data">${escapeHtml(tData.airline)} (${escapeHtml(tData.flightNumber || 'MS 901')})</span></div>
          </td>
          <td>
            <div class="tabular-nums">${formatDate(tData.departureDate)}</div>
          </td>
          <td>
            <div class="tabular-nums font-bold">${formatCurrency(tData.ticketPrice, tData.currency)}</div>
            <div class="cell-sub text-muted">${escapeHtml(t('common.paid'))}: ${formatCurrency(totalPaid, tData.currency)}</div>
          </td>
          <td>${renderStatusBadge(tData.status)}</td>
          <td>
            <a href="/tickets/${escapeHtml(tData.id)}" class="btn btn-sm btn-ghost text-accent" data-link>
              ${escapeHtml(t('common.details'))} ›
            </a>
          </td>
        </tr>
      `;
    }).join('');

    const allPayments = [];
    const allRefunds = [];
    stats.tickets.forEach(tData => {
      (tData.payments || []).forEach(p => {
        allPayments.push({
          ...p,
          ticketId: tData.id,
          ticketNumber: tData.ticketNumber,
          pnr: tData.pnr,
          currency: tData.currency
        });
      });
      (tData.refunds || []).forEach(r => {
        allRefunds.push({
          ...r,
          ticketId: tData.id,
          pnr: tData.pnr,
          currency: tData.currency
        });
      });
    });
    allPayments.sort((a, b) => new Date(b.date) - new Date(a.date));
    allRefunds.sort((a, b) => new Date(b.requestedDate || b.date) - new Date(a.requestedDate || a.date));

    const paymentRows = allPayments.map(p => `
      <tr>
        <td>
          <div class="cell-main">${formatDateTime(p.date)}</div>
          <a href="/tickets/${escapeHtml(p.ticketId)}" class="cell-sub font-medium text-accent ltr-data" data-link>
            ${escapeHtml(p.ticketId)} (PNR: ${escapeHtml(p.pnr)})
          </a>
        </td>
        <td>
          <span class="tabular-nums font-bold text-success" style="font-size: 15px;">
            ${formatCurrency(p.amount, p.currency || 'EGP')}
          </span>
        </td>
        <td>
          <div class="d-flex items-center gap-xs">
            ${icons.payments('w-4 h-4 text-muted')}
            <span>${escapeHtml(p.method)}</span>
          </div>
        </td>
        <td>
          <span class="airline-code-badge ltr-data">${escapeHtml(p.reference || 'N/A')}</span>
        </td>
        <td>
          <span class="text-sm font-medium">${escapeHtml(p.addedBy || 'Agent')}</span>
        </td>
      </tr>
    `).join('');

    const refundRows = allRefunds.map(r => `
      <tr>
        <td><strong class="cell-main ltr-data">${escapeHtml(r.id)}</strong></td>
        <td>
          <a href="/tickets/${escapeHtml(r.ticketId)}" class="cell-main text-accent ltr-data" data-link>${escapeHtml(r.ticketId)}</a>
          <div class="cell-sub font-medium">PNR: <span class="ltr-data">${escapeHtml(r.pnr)}</span></div>
        </td>
        <td>
          <span class="tabular-nums font-bold text-danger" style="font-size: 15px;">
            ${formatCurrency(r.amount, r.currency)}
          </span>
        </td>
        <td>
          <span class="text-sm">${escapeHtml(r.reason)}</span>
        </td>
        <td>
          ${renderStatusBadge(r.status)}
        </td>
        <td>
          <span class="text-sm text-muted">${formatDateTime(r.requestedDate)}</span>
        </td>
      </tr>
    `).join('');

    const notesHtml = (customer.notes || []).map(n => `
      <div class="p-sm mb-xs" style="background-color: var(--color-surface); border-radius: var(--radius-md); border: 1px solid var(--color-border-soft);">
        <div class="d-flex justify-between text-xs text-muted mb-xs">
          <strong>${escapeHtml(n.author || 'Agent')}</strong>
          <span>${formatDate(n.date)}</span>
        </div>
        <p style="font-size: 13px; color: var(--color-text); margin: 0;">${escapeHtml(n.text)}</p>
      </div>
    `).join('');

    return `
      <!-- Header -->
      <div class="page-header">
        <div class="page-header-left">
          <div class="page-breadcrumbs">
            <a href="/customers" data-link>${escapeHtml(t('nav.customers'))}</a>
            <span class="breadcrumb-separator">›</span>
            <span>${escapeHtml(customer.name)}</span>
          </div>
          <h1 class="page-title">
            <span>${escapeHtml(customer.name)}</span>
            ${customer.isVip ? '<span class="badge badge-vip ms-xs">VIP</span>' : ''}
          </h1>
          <p class="page-subtitle">${escapeHtml(customer.id)}</p>
        </div>

        <div class="page-actions">
          <button type="button" class="btn btn-secondary" id="edit-customer-btn">
            ${icons.edit('w-4 h-4')}
            <span>${escapeHtml(t('customerDetails.editProfile'))}</span>
          </button>
          <a href="/tickets/new" class="btn btn-primary" data-link>
            ${icons.plus('w-4 h-4')}
            <span>${escapeHtml(t('nav.newTicket'))}</span>
          </a>
        </div>
      </div>

      <!-- Customer Overview Cards Grid -->
      <div class="grid grid-cols-12 gap-lg mb-lg">
        <div class="col-span-4">
          <div class="card p-md">
            <h3 class="card-title mb-md">${escapeHtml(t('customerDetails.contactInfo'))}</h3>
            <div class="d-flex flex-column gap-sm text-sm">
              <div class="d-flex justify-between">
                <span class="text-muted">${escapeHtml(t('customerDetails.phone'))}</span>
                <strong class="ltr-data">${escapeHtml(customer.phone || '--')}</strong>
              </div>
              <div class="d-flex justify-between">
                <span class="text-muted">${escapeHtml(t('customerDetails.email'))}</span>
                <span class="ltr-data">${escapeHtml(customer.email || '--')}</span>
              </div>
              <div class="d-flex justify-between">
                <span class="text-muted">${escapeHtml(t('customerDetails.passport'))}</span>
                <strong class="ltr-data">${escapeHtml(customer.passport || '--')}</strong>
              </div>
              <div class="d-flex justify-between">
                <span class="text-muted">${escapeHtml(t('customerDetails.nationality'))}</span>
                <span>${escapeHtml(customer.nationality || 'Egyptian')}</span>
              </div>
            </div>
          </div>
        </div>

        <div class="col-span-8">
          <div class="stat-card-grid" style="margin-bottom: 0;">
            <div class="stat-card">
              <span class="stat-card-label">${escapeHtml(t('customerDetails.totalTickets'))}</span>
              <div class="stat-card-value">${stats.ticketCount}</div>
            </div>
            <div class="stat-card">
              <span class="stat-card-label">${escapeHtml(t('customerDetails.totalSpent'))}</span>
              <div class="stat-card-value font-bold">${formatCurrency(stats.totalSpent, 'EGP')}</div>
            </div>
            <div class="stat-card">
              <span class="stat-card-label">${escapeHtml(t('dashboard.kpi.totalCollected'))}</span>
              <div class="stat-card-value text-success font-bold">${formatCurrency(stats.totalPaid, 'EGP')}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Tab Container -->
      <div class="card" id="customer-tabs-card">
        ${renderTabs(tabs, activeTab)}

        <div class="tab-pane ${activeTab === 'tickets' ? 'active' : ''}" id="tab-pane-tickets">
          <div class="table-responsive">
            <table class="data-table">
              <thead>
                <tr>
                  <th>PNR</th>
                  <th>${escapeHtml(t('tickets.table.route'))}</th>
                  <th>${escapeHtml(t('tickets.table.travelDate'))}</th>
                  <th>${escapeHtml(t('tickets.table.price'))}</th>
                  <th>${escapeHtml(t('tickets.table.status'))}</th>
                  <th>${escapeHtml(t('tickets.table.actions'))}</th>
                </tr>
              </thead>
              <tbody>
                ${ticketRows || `<tr><td colspan="6" class="text-center text-muted p-lg">${escapeHtml(t('customerDetails.emptyTickets'))}</td></tr>`}
              </tbody>
            </table>
          </div>
        </div>

        <div class="tab-pane ${activeTab === 'payments' ? 'active' : ''}" id="tab-pane-payments">
          <div class="table-responsive">
            <table class="data-table">
              <thead>
                <tr>
                  <th>${escapeHtml(t('payments.table.date'))} & ${escapeHtml(t('payments.table.ticketId'))}</th>
                  <th>${escapeHtml(t('payments.table.amount'))}</th>
                  <th>${escapeHtml(t('payments.table.method'))}</th>
                  <th>${escapeHtml(t('payments.table.reference'))}</th>
                  <th>${escapeHtml(t('payments.table.collectedBy'))}</th>
                </tr>
              </thead>
              <tbody>
                ${paymentRows || `<tr><td colspan="5" class="text-center text-muted p-lg">${escapeHtml(t('common.noData'))}</td></tr>`}
              </tbody>
            </table>
          </div>
        </div>

        <div class="tab-pane ${activeTab === 'refunds' ? 'active' : ''}" id="tab-pane-refunds">
          <div class="table-responsive">
            <table class="data-table">
              <thead>
                <tr>
                  <th>${escapeHtml(t('refunds.table.id'))}</th>
                  <th>${escapeHtml(t('refunds.table.ticketId'))}</th>
                  <th>${escapeHtml(t('refunds.table.refundAmount'))}</th>
                  <th>${escapeHtml(t('common.reason'))}</th>
                  <th>${escapeHtml(t('refunds.table.status'))}</th>
                  <th>${escapeHtml(t('common.date'))}</th>
                </tr>
              </thead>
              <tbody>
                ${refundRows || `<tr><td colspan="6" class="text-center text-muted p-lg">${escapeHtml(t('common.noData'))}</td></tr>`}
              </tbody>
            </table>
          </div>
        </div>

        <div class="tab-pane ${activeTab === 'notes' ? 'active' : ''}" id="tab-pane-notes">
          <div class="card-body">
            <div class="mb-lg" id="customer-notes-list">
              ${notesHtml || `<p class="text-sm text-muted mb-md">${escapeHtml(t('common.noData'))}</p>`}
            </div>

            <!-- Add Note Form -->
            <div class="pt-md" style="border-top: 1px solid var(--color-border-soft);">
              <h4 class="font-semibold text-sm mb-sm">${escapeHtml(t('customerDetails.notes'))}</h4>
              <div class="form-group mb-sm">
                <textarea
                  id="new-customer-note-text"
                  class="form-control"
                  rows="3"
                  placeholder="${escapeHtml(t('customerDetails.notePlaceholder'))}"
                ></textarea>
              </div>
              <div class="d-flex justify-end">
                <button type="button" class="btn btn-primary" id="btn-add-customer-note">
                  ${icons.plus('w-4 h-4')}
                  <span>${escapeHtml(t('customerDetails.addNote'))}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  },

  afterRender(container, params, activeTab = 'tickets') {
    const customerId = params.id;
    const tabCard = container.querySelector('#customer-tabs-card');
    if (tabCard) {
      bindTabs(tabCard);
    }

    const editBtn = container.querySelector('#edit-customer-btn');
    if (editBtn) {
      editBtn.addEventListener('click', () => {
        const customer = CustomerService.getCustomerById(customerId);
        if (!customer) return;

        openModal({
          title: t('customerDetails.editProfile'),
          subtitle: `${customer.name} (#${customer.id})`,
          contentHtml: `
            <form id="edit-cust-form" class="d-flex flex-column gap-md">
              <div class="form-group">
                <label class="form-label" for="edit-c-name">${escapeHtml(t('ticketCreate.passengerInfo.passengerName'))} *</label>
                <input type="text" id="edit-c-name" class="form-control" value="${escapeHtml(customer.name)}" required />
              </div>
              <div class="form-grid-2">
                <div class="form-group">
                  <label class="form-label" for="edit-c-phone">${escapeHtml(t('customerDetails.phone'))}</label>
                  <input type="tel" id="edit-c-phone" class="form-control ltr-field" value="${escapeHtml(customer.phone || '')}" />
                </div>
                <div class="form-group">
                  <label class="form-label" for="edit-c-email">${escapeHtml(t('customerDetails.email'))}</label>
                  <input type="email" id="edit-c-email" class="form-control ltr-field" value="${escapeHtml(customer.email || '')}" />
                </div>
              </div>
              <div class="form-grid-2">
                <div class="form-group">
                  <label class="form-label" for="edit-c-pass">${escapeHtml(t('customerDetails.passport'))} *</label>
                  <input type="text" id="edit-c-pass" class="form-control ltr-field" value="${escapeHtml(customer.passport || '')}" required />
                </div>
                <div class="form-group">
                  <label class="form-label" for="edit-c-nat">${escapeHtml(t('customerDetails.nationality'))}</label>
                  <input type="text" id="edit-c-nat" class="form-control" value="${escapeHtml(customer.nationality || 'Egyptian')}" />
                </div>
              </div>
            </form>
          `,
          footerHtml: `
            <button type="button" class="btn btn-secondary" id="cancel-edit-cust">${escapeHtml(t('common.cancel'))}</button>
            <button type="button" class="btn btn-primary" id="save-edit-cust">${escapeHtml(t('common.saveChanges'))}</button>
          `,
          onOpen: (modalEl) => {
            const cancel = modalEl.querySelector('#cancel-edit-cust');
            const save = modalEl.querySelector('#save-edit-cust');
            if (cancel) cancel.addEventListener('click', closeModal);
            if (save) {
              save.addEventListener('click', async () => {
                const name = modalEl.querySelector('#edit-c-name').value.trim();
                const passport = modalEl.querySelector('#edit-c-pass').value.trim();
                if (!name || !passport) {
                  showToast(t('validation.requiredField'), 'error');
                  return;
                }

                save.disabled = true;
                const result = await CustomerService.updateCustomer(customerId, {
                  name,
                  passport,
                  phone: modalEl.querySelector('#edit-c-phone').value.trim(),
                  email: modalEl.querySelector('#edit-c-email').value.trim(),
                  nationality: modalEl.querySelector('#edit-c-nat').value.trim()
                });
                save.disabled = false;

                if (!result.success) {
                  showToast(result.error?.message || 'Failed to update customer', 'error');
                  return;
                }

                closeModal();
                showToast(t('toasts.customerUpdated'), 'success');
                container.innerHTML = CustomerDetailsPage.render(params);
                CustomerDetailsPage.afterRender(container, params);
              });
            }
          }
        });
      });
    }

    const addNoteBtn = container.querySelector('#btn-add-customer-note');
    const noteTextarea = container.querySelector('#new-customer-note-text');
    if (addNoteBtn && noteTextarea) {
      addNoteBtn.addEventListener('click', async () => {
        const text = noteTextarea.value.trim();
        if (!text) {
          showToast(t('validation.requiredField'), 'error');
          return;
        }

        addNoteBtn.disabled = true;
        const result = await CustomerService.addNote(customerId, text);
        addNoteBtn.disabled = false;

        if (!result.success) {
          showToast(result.error?.message || 'Failed to add note', 'error');
          return;
        }

        noteTextarea.value = '';
        showToast(t('toasts.noteAdded'), 'success');
        container.innerHTML = CustomerDetailsPage.render(params, 'notes');
        CustomerDetailsPage.afterRender(container, params, 'notes');
      });
    }
  }
};

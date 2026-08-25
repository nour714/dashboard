/**
 * AfricaTravel — Customer Details Page
 */

import { CustomerService } from '../services/customer-service.js';
import { AuthService } from '../services/auth-service.js';
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
    const currentUser = AuthService.getCurrentUser();
    const isAdmin = (currentUser?.role || '').toUpperCase() === 'ADMIN';

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
          ${isAdmin ? `
            <button type="button" class="btn btn-danger-outline" id="delete-customer-btn">
              ${icons.trash('w-4 h-4')}
              <span>${escapeHtml(t('common.delete'))}</span>
            </button>
          ` : ''}
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

        <!-- Passport Document Section -->
        <div class="col-span-4">
          <div class="card p-md">
            <h3 class="card-title mb-md">${escapeHtml('Passport Document')}</h3>
            <div id="passport-doc-section" class="d-flex flex-column gap-sm">
              ${customer.passportDocUploadedAt ? `
                <div class="d-flex flex-column gap-sm">
                  <div class="d-flex justify-between align-items-center text-sm">
                    <span class="text-muted">Uploaded</span>
                    <span>${escapeHtml(formatDate(customer.passportDocUploadedAt))}</span>
                  </div>
                  <div class="d-flex gap-sm" style="margin-top: 4px;">
                    <button type="button" class="btn btn-primary btn-sm" id="btn-view-passport-doc" style="flex:1;">
                      ${icons.eye || ''} View Document
                    </button>
                    ${isAdmin ? `
                      <button type="button" class="btn btn-danger btn-sm" id="btn-delete-passport-doc">
                        ${icons.trash || ''} Delete
                      </button>
                    ` : ''}
                  </div>
                  <div class="text-sm" style="margin-top: 4px;">
                    <span class="text-muted">Replace:</span>
                    <input type="file" id="passport-doc-input" accept=".jpg,.jpeg,.png,.pdf" class="form-control" style="font-size:12px; padding:4px; margin-top:4px;" />
                    <button type="button" class="btn btn-secondary btn-sm" id="btn-upload-passport-doc" style="margin-top:6px; width:100%;" disabled>
                      Upload New
                    </button>
                    <div id="passport-doc-error" class="text-danger text-xs" style="margin-top:4px; display:none;"></div>
                  </div>
                </div>
              ` : `
                <div class="d-flex flex-column gap-sm">
                  <p class="text-muted text-sm" style="margin:0;">No passport document uploaded yet.</p>
                  <input type="file" id="passport-doc-input" accept=".jpg,.jpeg,.png,.pdf" class="form-control" style="font-size:12px; padding:4px;" />
                  <button type="button" class="btn btn-primary btn-sm" id="btn-upload-passport-doc" style="width:100%;" disabled>
                    Upload Document
                  </button>
                  <div id="passport-doc-error" class="text-danger text-xs" style="margin-top:4px; display:none;"></div>
                </div>
              `}
            </div>
          </div>
        </div>

        <div class="col-span-4">
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

    const deleteCustomerBtn = container.querySelector('#delete-customer-btn');
    if (deleteCustomerBtn) {
      deleteCustomerBtn.addEventListener('click', () => {
        const customer = CustomerService.getCustomerById(customerId);
        if (!customer) return;

        openModal({
          title: `${t('common.delete') || 'Delete Customer'} #${customer.id}`,
          subtitle: `${customer.name} (${customer.phone || customer.email || ''})`,
          contentHtml: `
            <div class="d-flex flex-column gap-md">
              <div class="p-md rounded-md" style="background-color: rgba(239, 68, 68, 0.08); border: 1px solid rgba(239, 68, 68, 0.2); border-radius: var(--radius-md);">
                <div class="font-semibold text-danger mb-xs" style="font-size: 14px;">
                  ⚠️ ${escapeHtml(t('modals.deleteCustomer.warning') || 'هل أنت متأكد من رغبتك في حذف هذا العميل؟')}
                </div>
                <p class="text-xs text-muted" style="margin: 0; line-height: 1.5;">
                  ${escapeHtml(t('modals.deleteCustomer.explanation') || 'سيتم وضع علامة محذوف على العميل ولن يظهر في القوائم الرئيسية. لن تتم العملية إذا كان لدى العميل أي تذاكر نشطة.')}
                </p>
              </div>

              <div id="delete-cust-error-box" class="p-sm text-sm text-danger" style="display: none; background-color: rgba(239, 68, 68, 0.1); border-radius: var(--radius-md); border: 1px solid rgba(239, 68, 68, 0.3);"></div>
            </div>
          `,
          footerHtml: `
            <button type="button" class="btn btn-secondary" id="cancel-delete-cust">${escapeHtml(t('common.cancel'))}</button>
            <button type="button" class="btn btn-danger" id="confirm-delete-cust">${escapeHtml(t('common.delete'))}</button>
          `,
          onOpen: (modalEl) => {
            const cancelBtn = modalEl.querySelector('#cancel-delete-cust');
            const confirmBtn = modalEl.querySelector('#confirm-delete-cust');
            const errorBox = modalEl.querySelector('#delete-cust-error-box');

            if (cancelBtn) cancelBtn.addEventListener('click', closeModal);

            if (confirmBtn) {
              confirmBtn.addEventListener('click', async () => {
                confirmBtn.disabled = true;
                if (errorBox) {
                  errorBox.style.display = 'none';
                  errorBox.textContent = '';
                }

                const result = await CustomerService.deleteCustomer(customerId);
                confirmBtn.disabled = false;

                if (!result.success) {
                  const msg = result.error?.message || 'Failed to delete customer';
                  if (errorBox) {
                    errorBox.textContent = msg;
                    errorBox.style.display = 'block';
                  }
                  showToast(msg, 'error');
                  return;
                }

                closeModal();
                showToast(t('toasts.customerDeleted') || 'Customer deleted successfully', 'success');
                window.history.pushState(null, null, '/customers');
                window.dispatchEvent(new PopStateEvent('popstate'));
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

    // --- Passport Document Handlers ---
    const passportInput = container.querySelector('#passport-doc-input');
    const passportUploadBtn = container.querySelector('#btn-upload-passport-doc');
    const passportError = container.querySelector('#passport-doc-error');

    if (passportInput && passportUploadBtn) {
      passportInput.addEventListener('change', () => {
        const file = passportInput.files[0];
        if (passportError) { passportError.style.display = 'none'; passportError.textContent = ''; }

        if (!file) {
          passportUploadBtn.disabled = true;
          return;
        }

        // Client-side validation (UX only — server is the real gatekeeper)
        const allowedExtensions = ['.jpg', '.jpeg', '.png', '.pdf'];
        const ext = '.' + file.name.split('.').pop().toLowerCase();
        if (!allowedExtensions.includes(ext)) {
          if (passportError) {
            passportError.textContent = 'Only .jpg, .jpeg, .png, and .pdf files are allowed.';
            passportError.style.display = 'block';
          }
          passportUploadBtn.disabled = true;
          passportInput.value = '';
          return;
        }

        const MAX_SIZE = 5 * 1024 * 1024; // 5MB
        if (file.size > MAX_SIZE) {
          if (passportError) {
            passportError.textContent = 'File size exceeds the 5MB limit.';
            passportError.style.display = 'block';
          }
          passportUploadBtn.disabled = true;
          passportInput.value = '';
          return;
        }

        passportUploadBtn.disabled = false;
      });

      passportUploadBtn.addEventListener('click', async () => {
        const file = passportInput.files[0];
        if (!file) return;

        passportUploadBtn.disabled = true;
        passportUploadBtn.textContent = 'Uploading…';
        if (passportError) { passportError.style.display = 'none'; }

        const result = await CustomerService.uploadPassportDocument(customerId, file);

        if (!result.success) {
          passportUploadBtn.disabled = false;
          passportUploadBtn.textContent = 'Upload Document';
          if (passportError) {
            passportError.textContent = result.error?.message || 'Upload failed. Please try again.';
            passportError.style.display = 'block';
          }
          showToast(result.error?.message || 'Upload failed', 'error');
          return;
        }

        showToast('Passport document uploaded successfully.', 'success');
        container.innerHTML = CustomerDetailsPage.render(params, activeTab);
        CustomerDetailsPage.afterRender(container, params, activeTab);
      });
    }

    const viewBtn = container.querySelector('#btn-view-passport-doc');
    if (viewBtn) {
      viewBtn.addEventListener('click', async () => {
        viewBtn.disabled = true;
        viewBtn.textContent = 'Loading…';

        const result = await CustomerService.getPassportDocument(customerId);

        viewBtn.disabled = false;
        viewBtn.innerHTML = `${icons.eye || ''} View Document`;

        if (!result.success || !result.data?.url) {
          showToast(result.error?.message || 'Could not load document', 'error');
          return;
        }

        window.open(result.data.url, '_blank', 'noopener,noreferrer');
      });
    }

    const deleteBtn = container.querySelector('#btn-delete-passport-doc');
    if (deleteBtn) {
      deleteBtn.addEventListener('click', async () => {
        if (!confirm('Are you sure you want to permanently delete this passport document?')) return;

        deleteBtn.disabled = true;
        deleteBtn.textContent = 'Deleting…';

        const result = await CustomerService.deletePassportDocument(customerId);

        if (!result.success) {
          deleteBtn.disabled = false;
          deleteBtn.innerHTML = `${icons.trash || ''} Delete`;
          showToast(result.error?.message || 'Delete failed', 'error');
          return;
        }

        showToast('Passport document deleted.', 'success');
        container.innerHTML = CustomerDetailsPage.render(params, activeTab);
        CustomerDetailsPage.afterRender(container, params, activeTab);
      });
    }
  }
};

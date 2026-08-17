/**
 * AfriciaTravel / VoyageDesk — Customer Details Page
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

export const CustomerDetailsPage = {
  render(params) {
    const customerId = params.id;
    const customer = CustomerService.getCustomerById(customerId);

    if (!customer) {
      return `
        <div class="empty-state" style="margin-top: 60px;">
          <div class="empty-state-title">Customer Not Found</div>
          <p class="empty-state-desc">The customer profile "${escapeHtml(customerId)}" does not exist.</p>
          <a href="/customers" class="btn btn-primary" data-link>Back to Customers</a>
        </div>
      `;
    }

    const stats = CustomerService.getCustomerStats(customerId);

    const tabs = [
      { id: 'tickets', label: 'Ticket History', badge: stats.tickets.length },
      { id: 'payments', label: 'Payment History' },
      { id: 'refunds', label: 'Refund History' },
      { id: 'notes', label: 'Profile Notes', badge: (customer.notes || []).length }
    ];

    const ticketRows = stats.tickets.map(t => {
      const totalPaid = calculateTotalPaid(t.payments);
      const remaining = calculateRemaining(t.ticketPrice, totalPaid);

      return `
        <tr>
          <td><strong class="airline-code-badge">${escapeHtml(t.pnr)}</strong></td>
          <td>
            <div class="font-semibold">${escapeHtml(t.origin)} ✈ ${escapeHtml(t.destination)}</div>
            <div class="cell-sub">${escapeHtml(t.airline)} (${escapeHtml(t.flightNumber || 'MS 901')})</div>
          </td>
          <td>
            <div class="tabular-nums">${formatDate(t.departureDate)}</div>
          </td>
          <td>
            <div class="tabular-nums font-bold">${formatCurrency(t.ticketPrice, t.currency)}</div>
            <div class="cell-sub text-muted">Paid: ${formatCurrency(totalPaid, t.currency)}</div>
          </td>
          <td>${renderStatusBadge(t.status)}</td>
          <td>
            <a href="/tickets/${escapeHtml(t.id)}" class="btn btn-sm btn-ghost text-accent" data-link>
              View Ticket ›
            </a>
          </td>
        </tr>
      `;
    }).join('');

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
            <a href="/customers" data-link>Customers</a>
            <span>›</span>
            <span>${escapeHtml(customer.name)}</span>
          </div>
          <h1 class="page-title">
            <span>${escapeHtml(customer.name)}</span>
            ${customer.isVip ? '<span class="badge badge-vip">VIP</span>' : ''}
          </h1>
          <p class="page-subtitle">Customer ID: ${escapeHtml(customer.id)} • Member since ${escapeHtml(customer.memberSince || '2023')}</p>
        </div>

        <div class="page-actions">
          <button type="button" class="btn btn-secondary" id="edit-customer-btn">
            ${icons.edit('w-4 h-4')}
            <span>Edit Customer</span>
          </button>
          <a href="/tickets/new" class="btn btn-primary" data-link>
            ${icons.plus('w-4 h-4')}
            <span>New Ticket</span>
          </a>
        </div>
      </div>

      <!-- Top KPI Row (5 Stat Cards) -->
      <div class="stat-card-grid mb-lg">
        <div class="stat-card">
          <span class="stat-card-label">TOTAL TICKETS</span>
          <div class="stat-card-value tabular-nums">${stats.ticketCount}</div>
          <div class="text-sm text-muted">Bookings</div>
        </div>

        <div class="stat-card">
          <span class="stat-card-label">TOTAL SPENT</span>
          <div class="stat-card-value tabular-nums">${formatCurrency(stats.totalSpent, 'EGP')}</div>
          <div class="text-sm text-muted">Lifetime Value</div>
        </div>

        <div class="stat-card">
          <span class="stat-card-label">TOTAL PAID</span>
          <div class="stat-card-value tabular-nums text-success">${formatCurrency(stats.totalPaid, 'EGP')}</div>
          <div class="text-sm text-success">Settled</div>
        </div>

        <div class="stat-card">
          <span class="stat-card-label">OUTSTANDING</span>
          <div class="stat-card-value tabular-nums ${stats.totalOutstanding > 0 ? 'highlight-danger' : ''}">${formatCurrency(stats.totalOutstanding, 'EGP')}</div>
          <div class="text-sm text-muted">Balance Due</div>
        </div>

        <div class="stat-card">
          <span class="stat-card-label">TOTAL REFUNDED</span>
          <div class="stat-card-value tabular-nums text-danger">${formatCurrency(stats.totalRefunded, 'EGP')}</div>
          <div class="text-sm text-muted">Disbursed</div>
        </div>
      </div>

      <!-- Main 2-Column Content -->
      <div class="grid grid-cols-12 gap-lg">
        <!-- Left: Contact & Notes (4 Cols) -->
        <div class="col-span-4 d-flex flex-column gap-lg">
          <!-- Contact Info -->
          <div class="card">
            <div class="card-header">
              <h3 class="card-title">Contact Information</h3>
            </div>
            <div class="card-body text-sm d-flex flex-column gap-md">
              <div class="d-flex items-start gap-sm">
                ${icons.phone('w-4 h-4 text-muted mt-xs')}
                <div>
                  <div class="text-muted text-xs">Phone Number</div>
                  <strong class="text-md">${escapeHtml(customer.phone || '—')}</strong>
                </div>
              </div>

              <div class="d-flex items-start gap-sm">
                ${icons.mail('w-4 h-4 text-muted mt-xs')}
                <div>
                  <div class="text-muted text-xs">Email Address</div>
                  <div class="font-medium">${escapeHtml(customer.email || '—')}</div>
                </div>
              </div>

              <div class="d-flex items-start gap-sm">
                ${icons.shield('w-4 h-4 text-muted mt-xs')}
                <div>
                  <div class="text-muted text-xs">Passport Number</div>
                  <strong class="tabular-nums">${escapeHtml(customer.passport || '—')}</strong>
                </div>
              </div>

              <div class="d-flex items-start gap-sm">
                ${icons.compass('w-4 h-4 text-muted mt-xs')}
                <div>
                  <div class="text-muted text-xs">Nationality</div>
                  <div>${escapeHtml(customer.nationality || 'Egyptian (EGY)')}</div>
                </div>
              </div>
            </div>
          </div>

          <!-- Notes Card -->
          <div class="card">
            <div class="card-header">
              <h3 class="card-title">Recent Notes</h3>
              <button type="button" class="btn btn-sm btn-ghost text-accent" id="add-note-modal-btn">+ Add Note</button>
            </div>
            <div class="card-body">
              ${notesHtml || '<p class="text-sm text-muted text-center p-md">No profile notes added yet.</p>'}
            </div>
          </div>
        </div>

        <!-- Right: Tabs & History (8 Cols) -->
        <div class="col-span-8">
          <div class="card">
            ${renderTabs(tabs, 'tickets')}

            <!-- Tab 1: Ticket History -->
            <div class="tab-pane active" id="tab-pane-tickets">
              <div class="table-responsive">
                <table class="data-table">
                  <thead>
                    <tr>
                      <th>PNR</th>
                      <th>ROUTE</th>
                      <th>DATE</th>
                      <th>AMOUNT</th>
                      <th>STATUS</th>
                      <th>ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${ticketRows || '<tr><td colspan="6" class="text-center text-muted p-lg">No tickets found for this customer.</td></tr>'}
                  </tbody>
                </table>
              </div>
            </div>

            <!-- Tab 2: Payments -->
            <div class="tab-pane" id="tab-pane-payments">
              <div class="p-lg">
                <h4 class="mb-sm">Lifetime Payments Ledger</h4>
                <p class="text-sm text-muted mb-md">Total payments collected: <strong>${formatCurrency(stats.totalPaid, 'EGP')}</strong></p>
                <div class="table-responsive">
                  <table class="data-table">
                    <thead>
                      <tr>
                        <th>TICKET</th>
                        <th>AMOUNT</th>
                        <th>METHOD</th>
                        <th>DATE</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${stats.tickets.flatMap(t => (t.payments || []).map(p => `
                        <tr>
                          <td><a href="/tickets/${escapeHtml(t.id)}" class="cell-main text-accent" data-link>${escapeHtml(t.id)} (${escapeHtml(t.pnr)})</a></td>
                          <td><span class="tabular-nums font-bold text-success">${formatCurrency(p.amount, p.currency || t.currency)}</span></td>
                          <td>${escapeHtml(p.method)}</td>
                          <td><span class="text-sm text-muted">${formatDateTime(p.date)}</span></td>
                        </tr>
                      `)).join('') || '<tr><td colspan="4" class="text-center text-muted p-md">No payments recorded.</td></tr>'}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <!-- Tab 3: Refunds -->
            <div class="tab-pane" id="tab-pane-refunds">
              <div class="p-lg">
                <h4 class="mb-sm">Customer Refund Ledger</h4>
                <p class="text-sm text-muted mb-md">Total refunded: <strong>${formatCurrency(stats.totalRefunded, 'EGP')}</strong></p>
                <div class="table-responsive">
                  <table class="data-table">
                    <thead>
                      <tr>
                        <th>TICKET</th>
                        <th>REFUND AMOUNT</th>
                        <th>STATUS</th>
                        <th>REASON</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${stats.tickets.flatMap(t => (t.refunds || []).map(r => `
                        <tr>
                          <td><a href="/tickets/${escapeHtml(t.id)}" class="cell-main text-accent" data-link>${escapeHtml(t.id)}</a></td>
                          <td><span class="tabular-nums font-bold text-danger">${formatCurrency(r.amount, r.currency || t.currency)}</span></td>
                          <td>${renderStatusBadge(r.status)}</td>
                          <td><span class="text-sm">${escapeHtml(r.reason)}</span></td>
                        </tr>
                      `)).join('') || '<tr><td colspan="4" class="text-center text-muted p-md">No refunds recorded.</td></tr>'}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <!-- Tab 4: Notes -->
            <div class="tab-pane" id="tab-pane-notes">
              <div class="p-lg">
                <div class="d-flex justify-between items-center mb-md">
                  <h4>All Operational Notes</h4>
                  <button type="button" class="btn btn-sm btn-primary" id="tab-add-note-btn">+ Add Note</button>
                </div>
                ${notesHtml}
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  },

  afterRender(container, params) {
    const customerId = params.id;
    bindTabs(container);

    const addNoteBtn = container.querySelector('#add-note-modal-btn');
    const tabAddNoteBtn = container.querySelector('#tab-add-note-btn');
    const editCustBtn = container.querySelector('#edit-customer-btn');

    const triggerAddNote = () => {
      openModal({
        title: 'Add Profile Note',
        subtitle: `Add note for ${params.id}`,
        contentHtml: `
          <div class="form-group">
            <label class="form-label" for="new-note-text">Note Details *</label>
            <textarea id="new-note-text" class="form-control" placeholder="Enter notes about preferences, special requests, or travel documents..." required rows="4"></textarea>
          </div>
        `,
        footerHtml: `
          <button type="button" class="btn btn-secondary" id="modal-note-cancel">Cancel</button>
          <button type="button" class="btn btn-primary" id="modal-note-submit">Save Note</button>
        `,
        onOpen: (modalEl) => {
          const cancelBtn = modalEl.querySelector('#modal-note-cancel');
          const submitBtn = modalEl.querySelector('#modal-note-submit');

          if (cancelBtn) cancelBtn.addEventListener('click', closeModal);

          if (submitBtn) {
            submitBtn.addEventListener('click', () => {
              const text = modalEl.querySelector('#new-note-text').value.trim();
              if (!text) {
                showToast('Please enter note text', 'error');
                return;
              }

              const res = CustomerService.addNote(customerId, text);
              if (!res.success) {
                showToast(res.error.message, 'error');
                return;
              }

              closeModal();
              showToast('Note added to customer profile!', 'success');
              container.innerHTML = CustomerDetailsPage.render(params);
              CustomerDetailsPage.afterRender(container, params);
            });
          }
        }
      });
    };

    if (addNoteBtn) addNoteBtn.addEventListener('click', triggerAddNote);
    if (tabAddNoteBtn) tabAddNoteBtn.addEventListener('click', triggerAddNote);

    if (editCustBtn) {
      editCustBtn.addEventListener('click', () => {
        const customer = CustomerService.getCustomerById(customerId);
        if (!customer) return;

        openModal({
          title: `Edit Customer Profile`,
          subtitle: `${customer.name} (${customer.id})`,
          contentHtml: `
            <div class="d-flex flex-column gap-md">
              <div class="form-grid-2">
                <div class="form-group">
                  <label class="form-label" for="edit-cust-name">Full Name *</label>
                  <input type="text" id="edit-cust-name" class="form-control" value="${escapeHtml(customer.name || '')}" required />
                </div>
                <div class="form-group">
                  <label class="form-label" for="edit-cust-email">Email Address</label>
                  <input type="email" id="edit-cust-email" class="form-control" value="${escapeHtml(customer.email || '')}" />
                </div>
              </div>

              <div class="form-grid-2">
                <div class="form-group">
                  <label class="form-label" for="edit-cust-phone">Phone Number</label>
                  <input type="tel" id="edit-cust-phone" class="form-control" value="${escapeHtml(customer.phone || '')}" />
                </div>
                <div class="form-group">
                  <label class="form-label" for="edit-cust-passport">Passport Number</label>
                  <input type="text" id="edit-cust-passport" class="form-control" value="${escapeHtml(customer.passport || '')}" />
                </div>
              </div>

              <div class="form-group">
                <label class="d-flex items-center gap-xs" style="cursor: pointer;">
                  <input type="checkbox" id="edit-cust-vip" ${customer.isVip ? 'checked' : ''} />
                  <span class="font-semibold text-sm">VIP Customer Status</span>
                </label>
              </div>
            </div>
          `,
          footerHtml: `
            <button type="button" class="btn btn-secondary" id="modal-cancel-edit-cust">Cancel</button>
            <button type="button" class="btn btn-primary" id="modal-save-edit-cust">Save Changes</button>
          `,
          onOpen: (modalEl) => {
            const cancelBtn = modalEl.querySelector('#modal-cancel-edit-cust');
            const saveBtn = modalEl.querySelector('#modal-save-edit-cust');

            if (cancelBtn) cancelBtn.addEventListener('click', closeModal);
            if (saveBtn) {
              saveBtn.addEventListener('click', () => {
                const name = modalEl.querySelector('#edit-cust-name').value.trim();
                if (!name) {
                  showToast('Customer name is required', 'error');
                  return;
                }

                const res = CustomerService.updateCustomer(customerId, {
                  name,
                  email: modalEl.querySelector('#edit-cust-email').value.trim(),
                  phone: modalEl.querySelector('#edit-cust-phone').value.trim(),
                  passport: modalEl.querySelector('#edit-cust-passport').value.trim(),
                  isVip: modalEl.querySelector('#edit-cust-vip').checked
                });

                if (!res.success) {
                  showToast(res.error.message, 'error');
                  return;
                }

                closeModal();
                showToast(`Customer profile updated successfully!`, 'success');
                container.innerHTML = CustomerDetailsPage.render(params);
                CustomerDetailsPage.afterRender(container, params);
              });
            }
          }
        });
      });
    }
  }
};

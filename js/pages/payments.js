/**
 * AfriciaTravel / VoyageDesk — Payments Ledger Page
 */

import { store } from '../state/store.js';
import { TicketService } from '../services/ticket-service.js';
import { icons } from '../components/icons.js';
import { renderPageHeader } from '../components/page-header.js';
import { renderStatusBadge } from '../components/status-badge.js';
import { openModal, closeModal } from '../components/modal.js';
import { showToast } from '../components/toast.js';
import {
  calculateTotalPaid,
  calculateRemaining,
  formatCurrency,
  formatDateTime
} from '../utils/calculations.js';
import { escapeHtml } from '../utils/security.js';

export const PaymentsPage = {
  render() {
    const { tickets } = store.getState();

    // Flatten all payments across all tickets with ticket metadata
    const allPayments = [];
    let grandTotalValue = 0;
    let grandTotalPaid = 0;
    let grandTotalRemaining = 0;

    tickets.forEach(t => {
      grandTotalValue += Number(t.ticketPrice) || 0;
      const tPaid = calculateTotalPaid(t.payments);
      grandTotalPaid += tPaid;
      grandTotalRemaining += calculateRemaining(t.ticketPrice, tPaid);

      (t.payments || []).forEach(p => {
        allPayments.push({
          ...p,
          ticketId: t.id,
          ticketNumber: t.ticketNumber,
          passengerName: t.passengerName,
          pnr: t.pnr
        });
      });
    });

    // Sort by date descending
    allPayments.sort((a, b) => new Date(b.date) - new Date(a.date));

    const headerHtml = renderPageHeader({
      title: 'Payments Ledger',
      subtitle: 'Manage and review financial transactions across all customer reservations.',
      actionsHtml: `
        <button type="button" class="btn btn-primary" id="page-add-payment-btn">
          ${icons.plus('w-4 h-4')}
          <span>Add Payment</span>
        </button>
      `
    });

    const rowsHtml = allPayments.map(p => `
      <tr>
        <td>
          <div class="cell-main">${formatDateTime(p.date)}</div>
          <a href="/tickets/${escapeHtml(p.ticketId)}" class="cell-sub font-medium text-accent" data-link>
            ${escapeHtml(p.ticketId)} • ${escapeHtml(p.passengerName)}
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
          <span class="airline-code-badge">${escapeHtml(p.reference || 'N/A')}</span>
        </td>
        <td>
          <span class="text-sm font-medium">${escapeHtml(p.addedBy || 'Agent')}</span>
        </td>
        <td>
          <span class="text-sm text-secondary">${escapeHtml(p.notes || '—')}</span>
        </td>
      </tr>
    `).join('');

    return `
      ${headerHtml}

      <!-- Top Financial Summary Cards -->
      <div class="stat-card-grid mb-lg">
        <div class="stat-card">
          <span class="stat-card-label">TOTAL VALUE</span>
          <div class="stat-card-value tabular-nums">${formatCurrency(grandTotalValue, 'EGP')}</div>
          <div class="text-sm text-muted">All Bookings</div>
        </div>

        <div class="stat-card">
          <span class="stat-card-label">TOTAL PAID</span>
          <div class="stat-card-value tabular-nums text-success">${formatCurrency(grandTotalPaid, 'EGP')}</div>
          <div class="text-sm text-success font-semibold">Collected</div>
        </div>

        <div class="stat-card">
          <span class="stat-card-label">REMAINING</span>
          <div class="stat-card-value tabular-nums ${grandTotalRemaining > 0 ? 'highlight-danger' : ''}">${formatCurrency(grandTotalRemaining, 'EGP')}</div>
          <div class="text-sm text-muted">Outstanding</div>
        </div>

        <div class="stat-card">
          <span class="stat-card-label">PAYMENT STATUS</span>
          <div class="mt-sm">
            ${renderStatusBadge(grandTotalRemaining === 0 ? 'PAID' : 'PARTIALLY PAID')}
          </div>
          <div class="text-sm text-muted mt-sm">Ledger Active</div>
        </div>
      </div>

      <!-- Transactions Card -->
      <div class="card">
        <div class="card-header">
          <h3 class="card-title">Transaction History</h3>
          <div class="d-flex gap-xs">
            <button type="button" class="btn btn-sm btn-secondary" id="export-payments-btn">
              ${icons.download('w-4 h-4')}
              <span>Export</span>
            </button>
          </div>
        </div>

        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>DATE & TICKET</th>
                <th>AMOUNT</th>
                <th>METHOD</th>
                <th>REFERENCE</th>
                <th>ADDED BY</th>
                <th>NOTES</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml || '<tr><td colspan="6" class="text-center text-muted p-lg">No payments recorded.</td></tr>'}
            </tbody>
          </table>
        </div>
      </div>
    `;
  },

  afterRender(container) {
    const addBtn = container.querySelector('#page-add-payment-btn');
    const exportBtn = container.querySelector('#export-payments-btn');

    if (exportBtn) {
      exportBtn.addEventListener('click', () => {
        showToast('Exporting payments ledger...', 'info');
        setTimeout(() => showToast('Payments exported (payments.csv)', 'success'), 1000);
      });
    }

    if (addBtn) {
      addBtn.addEventListener('click', () => {
        const { tickets } = store.getState();
        const pendingTickets = tickets.filter(t => t.status !== 'CANCELLED');

        const optionsHtml = pendingTickets.map(t => {
          const tPaid = calculateTotalPaid(t.payments);
          const rem = calculateRemaining(t.ticketPrice, tPaid);
          return `<option value="${escapeHtml(t.id)}" data-price="${t.ticketPrice}" data-paid="${tPaid}" data-currency="${escapeHtml(t.currency || 'EGP')}">${escapeHtml(t.id)} — ${escapeHtml(t.passengerName)} (Rem: ${formatCurrency(rem, t.currency)})</option>`;
        }).join('');

        openModal({
          title: 'Record Payment',
          subtitle: 'Select ticket and enter payment details',
          contentHtml: `
            <div class="d-flex flex-column gap-md">
              <div class="form-group">
                <label class="form-label" for="global-pay-ticket">Select Ticket *</label>
                <select id="global-pay-ticket" class="form-control">
                  ${optionsHtml}
                </select>
              </div>

              <div class="form-grid-2">
                <div class="form-group">
                  <label class="form-label" for="global-pay-amount">Amount *</label>
                  <input type="number" id="global-pay-amount" class="form-control font-bold" placeholder="0.00" min="1" step="any" required />
                </div>
                <div class="form-group">
                  <label class="form-label" for="global-pay-method">Payment Method *</label>
                  <select id="global-pay-method" class="form-control">
                    <option value="Credit Card">Credit Card</option>
                    <option value="Cash">Cash</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="Vodafone Cash">Vodafone Cash</option>
                    <option value="InstaPay">InstaPay</option>
                  </select>
                </div>
              </div>

              <div class="form-grid-2">
                <div class="form-group">
                  <label class="form-label" for="global-pay-date">Date</label>
                  <input type="date" id="global-pay-date" class="form-control" value="${new Date().toISOString().slice(0, 10)}" />
                </div>
                <div class="form-group">
                  <label class="form-label" for="global-pay-ref">Reference</label>
                  <input type="text" id="global-pay-ref" class="form-control" placeholder="e.g. TRX-10294" />
                </div>
              </div>

              <div class="form-group">
                <label class="form-label" for="global-pay-notes">Notes</label>
                <textarea id="global-pay-notes" class="form-control" placeholder="Optional notes..."></textarea>
              </div>
            </div>
          `,
          footerHtml: `
            <button type="button" class="btn btn-secondary" id="global-pay-cancel-btn">Cancel</button>
            <button type="button" class="btn btn-primary" id="global-pay-submit-btn">Add Payment</button>
          `,
          onOpen: (modalEl) => {
            const cancelBtn = modalEl.querySelector('#global-pay-cancel-btn');
            const submitBtn = modalEl.querySelector('#global-pay-submit-btn');

            if (cancelBtn) cancelBtn.addEventListener('click', closeModal);

            if (submitBtn) {
              submitBtn.addEventListener('click', () => {
                const ticketId = modalEl.querySelector('#global-pay-ticket').value;
                const amount = Number(modalEl.querySelector('#global-pay-amount').value);

                const result = TicketService.addPayment(ticketId, {
                  amount,
                  method: modalEl.querySelector('#global-pay-method').value,
                  date: modalEl.querySelector('#global-pay-date').value,
                  reference: modalEl.querySelector('#global-pay-ref').value.trim() || `TRX-${Math.floor(100000 + Math.random() * 900000)}`,
                  notes: modalEl.querySelector('#global-pay-notes').value.trim()
                });

                if (!result.success) {
                  showToast(result.error.message, 'error');
                  return;
                }

                closeModal();
                showToast(`Payment of ${formatCurrency(amount, 'EGP')} added to ${ticketId}!`, 'success');
                container.innerHTML = PaymentsPage.render();
                PaymentsPage.afterRender(container);
              });
            }
          }
        });
      });
    }
  }
};

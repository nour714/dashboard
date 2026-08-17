/**
 * AfricaTravel — Refunds Management Page
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
  calculateTotalRefunded,
  calculateAvailableRefund,
  formatCurrency,
  formatDateTime
} from '../utils/calculations.js';
import { escapeHtml } from '../utils/security.js';

export const RefundsPage = {
  render() {
    const { tickets } = store.getState();

    const allRefunds = [];
    let totalRefundsCount = 0;
    let completedCount = 0;
    let requestedCount = 0;
    let totalRefundedAmount = 0;

    tickets.forEach(t => {
      (t.refunds || []).forEach(r => {
        allRefunds.push({
          ...r,
          ticketId: t.id,
          passengerName: t.passengerName,
          pnr: t.pnr,
          currency: t.currency
        });

        totalRefundsCount += 1;
        if (r.status === 'COMPLETED') {
          completedCount += 1;
          totalRefundedAmount += Number(r.amount) || 0;
        } else {
          requestedCount += 1;
        }
      });
    });

    const headerHtml = renderPageHeader({
      title: 'Refunds',
      subtitle: 'Manage, audit, and process passenger ticket refund claims.',
      actionsHtml: `
        <button type="button" class="btn btn-secondary" id="export-refunds-btn">
          ${icons.download('w-4 h-4')}
          <span>Export List</span>
        </button>
        <button type="button" class="btn btn-primary" id="page-initiate-refund-btn">
          ${icons.plus('w-4 h-4')}
          <span>Initiate Refund</span>
        </button>
      `
    });

    const rowsHtml = allRefunds.map(r => `
      <tr>
        <td><strong class="cell-main">${escapeHtml(r.id)}</strong></td>
        <td>
          <a href="/tickets/${escapeHtml(r.ticketId)}" class="cell-main text-accent" data-link>${escapeHtml(r.ticketId)}</a>
          <div class="cell-sub font-medium">PNR: ${escapeHtml(r.pnr)}</div>
        </td>
        <td>
          <div class="cell-main">${escapeHtml(r.passengerName)}</div>
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
        <td>
          <span class="text-sm font-medium">${escapeHtml(r.processedBy || 'Agent')}</span>
        </td>
      </tr>
    `).join('');

    return `
      ${headerHtml}

      <!-- Top KPI Row -->
      <div class="stat-card-grid mb-lg">
        <div class="stat-card">
          <span class="stat-card-label">REFUND REQUESTS</span>
          <div class="stat-card-value tabular-nums">${totalRefundsCount}</div>
          <div class="text-sm text-muted">Total Recorded</div>
        </div>

        <div class="stat-card">
          <span class="stat-card-label">PENDING / PROCESSING</span>
          <div class="stat-card-value tabular-nums" style="color: var(--color-warning);">${requestedCount}</div>
          <div class="text-sm text-warning font-semibold">Action Required</div>
        </div>

        <div class="stat-card">
          <span class="stat-card-label">COMPLETED</span>
          <div class="stat-card-value tabular-nums text-success">${completedCount}</div>
          <div class="text-sm text-success">Settled</div>
        </div>

        <div class="stat-card">
          <span class="stat-card-label">TOTAL REFUNDED</span>
          <div class="stat-card-value tabular-nums text-danger">${formatCurrency(totalRefundedAmount, 'EGP')}</div>
          <div class="text-sm text-muted">Disbursed</div>
        </div>
      </div>

      <!-- Refunds Ledger Card -->
      <div class="card">
        <div class="card-header">
          <h3 class="card-title">Recent Refunds</h3>
        </div>

        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>REFUND ID</th>
                <th>TICKET</th>
                <th>PASSENGER</th>
                <th>REFUND AMOUNT</th>
                <th>REASON</th>
                <th>STATUS</th>
                <th>DATE</th>
                <th>PROCESSED BY</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml || '<tr><td colspan="8" class="text-center text-muted p-lg">No refund claims recorded in the system.</td></tr>'}
            </tbody>
          </table>
        </div>
      </div>
    `;
  },

  afterRender(container) {
    const addBtn = container.querySelector('#page-initiate-refund-btn');
    const exportBtn = container.querySelector('#export-refunds-btn');

    if (exportBtn) {
      exportBtn.addEventListener('click', () => {
        showToast('Exporting refunds list...', 'info');
        setTimeout(() => showToast('Refunds exported (refunds.csv)', 'success'), 1000);
      });
    }

    if (addBtn) {
      addBtn.addEventListener('click', () => {
        const { tickets } = store.getState();
        const eligibleTickets = tickets.filter(t => {
          const totalPaid = calculateTotalPaid(t.payments);
          const totalRef = calculateTotalRefunded(t.refunds);
          return (totalPaid - totalRef) > 0;
        });

        if (eligibleTickets.length === 0) {
          showToast('No tickets currently have refundable balances', 'info');
          return;
        }

        const optionsHtml = eligibleTickets.map(t => {
          const totalPaid = calculateTotalPaid(t.payments);
          const totalRef = calculateTotalRefunded(t.refunds);
          const avail = calculateAvailableRefund(totalPaid, totalRef);
          return `<option value="${escapeHtml(t.id)}" data-avail="${avail}" data-currency="${escapeHtml(t.currency || 'EGP')}">${escapeHtml(t.id)} — ${escapeHtml(t.passengerName)} (Avail: ${formatCurrency(avail, t.currency)})</option>`;
        }).join('');

        openModal({
          title: 'Initiate Refund',
          subtitle: 'Select ticket and enter refund details',
          contentHtml: `
            <div class="d-flex flex-column gap-md">
              <div class="form-group">
                <label class="form-label" for="global-ref-ticket">Select Ticket *</label>
                <select id="global-ref-ticket" class="form-control">
                  ${optionsHtml}
                </select>
              </div>

              <div class="form-grid-2">
                <div class="form-group">
                  <label class="form-label" for="global-ref-amount">Refund Amount *</label>
                  <input type="number" id="global-ref-amount" class="form-control font-bold" placeholder="0.00" min="1" step="any" required />
                </div>

                <div class="form-group">
                  <label class="form-label">Status</label>
                  <select id="global-ref-status" class="form-control">
                    <option value="COMPLETED" selected>Process Immediately (Completed)</option>
                    <option value="REQUESTED">Draft (Pending Approval)</option>
                  </select>
                </div>
              </div>

              <div class="form-group">
                <label class="form-label" for="global-ref-reason">Reason Code / Explanation *</label>
                <textarea id="global-ref-reason" class="form-control" placeholder="Explain reason for refund..." required>Flight cancelled by airline / medical request.</textarea>
              </div>
            </div>
          `,
          footerHtml: `
            <button type="button" class="btn btn-secondary" id="global-ref-cancel-btn">Cancel</button>
            <button type="button" class="btn btn-danger" id="global-ref-submit-btn">Process Refund</button>
          `,
          onOpen: (modalEl) => {
            const ticketSelect = modalEl.querySelector('#global-ref-ticket');
            const amtInput = modalEl.querySelector('#global-ref-amount');
            const cancelBtn = modalEl.querySelector('#global-ref-cancel-btn');
            const submitBtn = modalEl.querySelector('#global-ref-submit-btn');

            const updateAvail = () => {
              const opt = ticketSelect.options[ticketSelect.selectedIndex];
              if (opt) {
                amtInput.value = opt.getAttribute('data-avail');
              }
            };
            ticketSelect.addEventListener('change', updateAvail);
            updateAvail();

            if (cancelBtn) cancelBtn.addEventListener('click', closeModal);

            if (submitBtn) {
              submitBtn.addEventListener('click', () => {
                const ticketId = ticketSelect.value;
                const amount = Number(amtInput.value);

                const result = TicketService.addRefund(ticketId, {
                  amount,
                  reason: modalEl.querySelector('#global-ref-reason').value.trim(),
                  status: modalEl.querySelector('#global-ref-status').value
                });

                if (!result.success) {
                  showToast(result.error.message, 'error');
                  return;
                }

                closeModal();
                showToast(`Refund of ${formatCurrency(amount, 'EGP')} processed!`, 'success');
                container.innerHTML = RefundsPage.render();
                RefundsPage.afterRender(container);
              });
            }
          }
        });
      });
    }
  }
};

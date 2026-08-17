/**
 * AfriciaTravel — Ticket Details: Payments Tab Component
 */

import { icons } from '../../components/icons.js';
import { formatCurrency, formatDateTime, formatRelativeTime } from '../../utils/calculations.js';
import { escapeHtml } from '../../utils/security.js';

export function renderPaymentsTab(ticket) {
  const paymentsRows = ticket.payments.length === 0 ? `
    <tr>
      <td colspan="6" class="text-center text-muted p-lg">
        <p>No payments recorded for this ticket.</p>
      </td>
    </tr>
  ` : ticket.payments.map(p => `
    <tr>
      <td>
        <div class="cell-main">${formatDateTime(p.date)}</div>
        <div class="cell-sub">${formatRelativeTime(p.date)}</div>
      </td>
      <td>
        <span class="tabular-nums font-bold text-success" style="font-size: 15px;">
          ${formatCurrency(p.amount, p.currency || ticket.currency)}
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
    <div class="tab-pane" id="tab-pane-payments">
      <div class="card-header">
        <h3 class="card-title">Transaction History</h3>
        <button type="button" class="btn btn-sm btn-primary" id="tab-add-payment-btn">
          ${icons.plus('w-4 h-4')}
          <span>Add Payment</span>
        </button>
      </div>
      <div class="table-responsive">
        <table class="data-table">
          <thead>
            <tr>
              <th>DATE</th>
              <th>AMOUNT</th>
              <th>METHOD</th>
              <th>REFERENCE</th>
              <th>ADDED BY</th>
              <th>NOTES</th>
            </tr>
          </thead>
          <tbody>
            ${paymentsRows}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

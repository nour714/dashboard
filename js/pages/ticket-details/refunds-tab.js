/**
 * AfricaTravel — Ticket Details: Refunds Tab Component
 */

import { icons } from '../../components/icons.js';
import { renderStatusBadge } from '../../components/status-badge.js';
import { formatCurrency, formatDateTime } from '../../utils/calculations.js';
import { escapeHtml } from '../../utils/security.js';

export function renderRefundsTab(ticket) {
  const refundsRows = ticket.refunds.length === 0 ? `
    <tr>
      <td colspan="6" class="text-center text-muted p-lg">
        <p>No refund transactions processed for this ticket.</p>
      </td>
    </tr>
  ` : ticket.refunds.map(r => `
    <tr>
      <td><strong class="cell-main">${escapeHtml(r.id)}</strong></td>
      <td>
        <span class="tabular-nums font-bold text-danger">
          ${formatCurrency(r.amount, r.currency || ticket.currency)}
        </span>
      </td>
      <td><span class="text-sm">${escapeHtml(r.reason)}</span></td>
      <td>${renderStatusBadge(r.status)}</td>
      <td><span class="text-sm text-muted">${formatDateTime(r.requestedDate)}</span></td>
      <td><span class="text-sm font-medium">${escapeHtml(r.processedBy || 'Agent')}</span></td>
    </tr>
  `).join('');

  return `
    <div class="tab-pane" id="tab-pane-refunds">
      <div class="card-header">
        <h3 class="card-title">Refund Transactions</h3>
        <button type="button" class="btn btn-sm btn-danger-outline" id="tab-add-refund-trigger-btn">
          ${icons.refunds('w-4 h-4')}
          <span>Process Refund</span>
        </button>
      </div>
      <div class="table-responsive">
        <table class="data-table">
          <thead>
            <tr>
              <th>REFUND ID</th>
              <th>AMOUNT</th>
              <th>REASON</th>
              <th>STATUS</th>
              <th>DATE PROCESSED</th>
              <th>PROCESSED BY</th>
            </tr>
          </thead>
          <tbody>
            ${refundsRows}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

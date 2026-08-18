/**
 * AfricaTravel - Ticket Details: Payments Tab Component
 */

import { icons } from '../../components/icons.js';
import { formatCurrency, formatDateTime } from '../../utils/calculations.js';
import { escapeHtml } from '../../utils/security.js';
import { t } from '../../i18n/i18n.js';

export function renderPaymentsTab(ticket) {
  const paymentsRows = ticket.payments.length === 0 ? `
    <tr>
      <td colspan="6" class="text-center text-muted p-lg">
        <p>${escapeHtml(t('ticketDetails.paymentsTab.empty'))}</p>
      </td>
    </tr>
  ` : ticket.payments.map(p => `
    <tr>
      <td><span class="text-sm font-medium tabular-nums">${formatDateTime(p.date)}</span></td>
      <td>
        <span class="tabular-nums font-bold text-success">
          ${formatCurrency(p.amount, p.currency || ticket.currency)}
        </span>
      </td>
      <td><span class="badge badge-neutral">${escapeHtml(p.method)}</span></td>
      <td><span class="font-mono text-xs ltr-data">${escapeHtml(p.reference || '-')}</span></td>
      <td><span class="text-sm text-muted">${escapeHtml(p.receivedBy || p.addedBy || 'Agent')}</span></td>
      <td><span class="text-sm text-secondary">${escapeHtml(p.notes || '-')}</span></td>
    </tr>
  `).join('');

  return `
    <div class="tab-pane" id="tab-pane-payments">
      <div class="card-header">
        <h3 class="card-title">${escapeHtml(t('ticketDetails.paymentsTab.title'))}</h3>
        <button type="button" class="btn btn-sm btn-primary" id="tab-add-payment-btn">
          ${icons.plus('w-4 h-4')}
          <span>${escapeHtml(t('ticketDetails.paymentsTab.addPaymentBtn'))}</span>
        </button>
      </div>
      <div class="table-responsive">
        <table class="data-table">
          <thead>
            <tr>
              <th>${escapeHtml(t('ticketDetails.paymentsTab.table.date'))}</th>
              <th>${escapeHtml(t('ticketDetails.paymentsTab.table.amount'))}</th>
              <th>${escapeHtml(t('ticketDetails.paymentsTab.table.method'))}</th>
              <th>${escapeHtml(t('ticketDetails.paymentsTab.table.reference'))}</th>
              <th>${escapeHtml(t('ticketDetails.paymentsTab.table.receivedBy'))}</th>
              <th>${escapeHtml(t('ticketDetails.paymentsTab.table.notes'))}</th>
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

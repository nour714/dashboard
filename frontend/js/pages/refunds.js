/**
 * AfricaTravel — Refunds Management Page
 */

import { store } from '../state/store.js';
import { TicketService } from '../services/ticket-service.js';
import { icons } from '../components/icons.js';
import { renderPageHeader } from '../components/page-header.js';
import { renderStatusBadge } from '../components/status-badge.js';
import { formatCurrency, formatDateTime } from '../utils/calculations.js';
import { escapeHtml } from '../utils/security.js';
import { t } from '../i18n/i18n.js';

export const RefundsPage = {
  render() {
    const { tickets } = store.getState();

    const allRefunds = [];
    let totalRefundsCount = 0;
    let completedCount = 0;
    let requestedCount = 0;
    let totalRefundedAmount = 0;

    tickets.forEach(tData => {
      (tData.refunds || []).forEach(r => {
        allRefunds.push({
          ...r,
          ticketId: tData.id,
          passengerName: tData.passengerName,
          pnr: tData.pnr,
          currency: tData.currency
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
      title: t('refunds.title'),
      subtitle: t('refunds.subtitle'),
      actionsHtml: ''
    });

    const rowsHtml = allRefunds.map(r => `
      <tr>
        <td><strong class="cell-main ltr-data">${escapeHtml(r.id)}</strong></td>
        <td>
          <a href="/tickets/${escapeHtml(r.ticketId)}" class="cell-main text-accent ltr-data" data-link>${escapeHtml(r.ticketId)}</a>
          <div class="cell-sub font-medium">PNR: <span class="ltr-data">${escapeHtml(r.pnr)}</span></div>
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
          <span class="stat-card-label">${escapeHtml(t('reports.kpi.refundsTotal'))}</span>
          <div class="stat-card-value tabular-nums text-danger">${formatCurrency(totalRefundedAmount, 'EGP')}</div>
        </div>

        <div class="stat-card">
          <span class="stat-card-label">${escapeHtml(t('status.COMPLETED'))}</span>
          <div class="stat-card-value font-bold">${completedCount}</div>
        </div>

        <div class="stat-card">
          <span class="stat-card-label">${escapeHtml(t('status.REFUND_REQUESTED'))}</span>
          <div class="stat-card-value font-bold text-warning">${requestedCount}</div>
        </div>
      </div>

      <!-- Main Refunds Table -->
      <div class="card">
        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>${escapeHtml(t('refunds.table.id'))}</th>
                <th>${escapeHtml(t('refunds.table.ticketId'))}</th>
                <th>${escapeHtml(t('refunds.table.passenger'))}</th>
                <th>${escapeHtml(t('refunds.table.refundAmount'))}</th>
                <th>${escapeHtml(t('common.reason'))}</th>
                <th>${escapeHtml(t('refunds.table.status'))}</th>
                <th>${escapeHtml(t('common.date'))}</th>
                <th>${escapeHtml(t('refunds.table.processedBy'))}</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml || `<tr><td colspan="8" class="text-center text-muted p-lg">${escapeHtml(t('common.noData'))}</td></tr>`}
            </tbody>
          </table>
        </div>
      </div>
    `;
  },

  afterRender(container) {
    // Event listeners if needed
  }
};

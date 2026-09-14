/**
 * AfricaTravel — Payments Ledger Page
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
import { t } from '../i18n/i18n.js';

export const PaymentsPage = {
  render() {
    const { tickets } = store.getState();

    // Flatten all payments across all tickets with ticket metadata
    const allPayments = [];
    let grandTotalValue = 0;
    let grandTotalPaid = 0;
    let grandTotalRemaining = 0;

    tickets.forEach(tData => {
      grandTotalValue += Number(tData.ticketPrice) || 0;
      const tPaid = calculateTotalPaid(tData.payments);
      grandTotalPaid += tPaid;
      grandTotalRemaining += calculateRemaining(tData.ticketPrice, tPaid);

      (tData.payments || []).forEach(p => {
        allPayments.push({
          ...p,
          ticketId: tData.id,
          ticketNumber: tData.ticketNumber,
          passengerName: tData.passengerName,
          pnr: tData.pnr
        });
      });
    });

    // Sort by date descending
    allPayments.sort((a, b) => new Date(b.date) - new Date(a.date));

    const headerHtml = renderPageHeader({
      title: t('payments.title'),
      subtitle: t('payments.subtitle'),
      actionsHtml: ''
    });

    const rowsHtml = allPayments.map(p => `
      <tr>
        <td>
          <div class="cell-main">${formatDateTime(p.date)}</div>
          <a href="/tickets/${escapeHtml(p.ticketId)}" class="cell-sub font-medium text-accent ltr-data" data-link>
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
          <span class="airline-code-badge ltr-data">${escapeHtml(p.reference || 'N/A')}</span>
        </td>
        <td>
          <span class="text-sm font-medium">${escapeHtml(p.addedBy || 'Agent')}</span>
        </td>
        <td>
          <span class="text-sm text-secondary">${escapeHtml(p.notes || '--')}</span>
        </td>
      </tr>
    `).join('');

    return `
      ${headerHtml}

      <!-- Top Financial Summary Cards -->
      <div class="stat-card-grid mb-lg">
        <div class="stat-card">
          <span class="stat-card-label">${escapeHtml(t('dashboard.kpi.totalSales'))}</span>
          <div class="stat-card-value tabular-nums">${formatCurrency(grandTotalValue, 'EGP')}</div>
          <div class="text-sm text-muted">${escapeHtml(t('dashboard.kpi.salesSubtitle'))}</div>
        </div>

        <div class="stat-card">
          <span class="stat-card-label">${escapeHtml(t('dashboard.kpi.totalCollected'))}</span>
          <div class="stat-card-value tabular-nums text-success">${formatCurrency(grandTotalPaid, 'EGP')}</div>
          <div class="text-sm text-muted">${escapeHtml(t('dashboard.kpi.collectedSubtitle'))}</div>
        </div>

        <div class="stat-card">
          <span class="stat-card-label">${escapeHtml(t('dashboard.kpi.remainingBalance'))}</span>
          <div class="stat-card-value tabular-nums text-danger">${formatCurrency(grandTotalRemaining, 'EGP')}</div>
          <div class="text-sm text-muted">${escapeHtml(t('dashboard.kpi.remainingSubtitle'))}</div>
        </div>
      </div>

      <!-- Main Payments Table Card -->
      <div class="card">
        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>${escapeHtml(t('payments.table.date'))} & ${escapeHtml(t('payments.table.ticketId'))}</th>
                <th>${escapeHtml(t('payments.table.amount'))}</th>
                <th>${escapeHtml(t('payments.table.method'))}</th>
                <th>${escapeHtml(t('payments.table.reference'))}</th>
                <th>${escapeHtml(t('payments.table.collectedBy'))}</th>
                <th>${escapeHtml(t('common.notes'))}</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml || `<tr><td colspan="6" class="text-center text-muted p-lg">${escapeHtml(t('common.noData'))}</td></tr>`}
            </tbody>
          </table>
        </div>
      </div>
    `;
  },

  afterRender(container) {
    // Event bindings if needed
  }
};

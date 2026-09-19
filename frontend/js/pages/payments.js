/**
 * AfricaTravel — Payments Ledger Page
 */

import { store } from '../state/store.js';
import { icons } from '../components/icons.js';
import { renderPageHeader } from '../components/page-header.js';
import {
  calculateTotalPaid,
  calculateRemaining,
  calculateTotalModificationFees,
  formatCurrency,
  formatDateTime
} from '../utils/calculations.js';
import { escapeHtml } from '../utils/security.js';
import { t } from '../i18n/i18n.js';

export const PaymentsPage = {
  render() {
    const { tickets = [] } = store.getState();

    // Flatten all payments across all tickets with ticket metadata & track totals per currency
    const allPayments = [];
    const totalsByCurrency = {};

    tickets.forEach(tData => {
      const curr = tData.currency || 'EGP';
      if (!totalsByCurrency[curr]) {
        totalsByCurrency[curr] = { value: 0, paid: 0, remaining: 0 };
      }

      const price = Number(tData.ticketPrice) || 0;
      const modFees = calculateTotalModificationFees(tData.modifications);
      totalsByCurrency[curr].value += (price + modFees);
      const tPaid = calculateTotalPaid(tData.payments);
      totalsByCurrency[curr].paid += tPaid;
      totalsByCurrency[curr].remaining += calculateRemaining(tData.ticketPrice, tPaid, modFees);

      (tData.payments || []).forEach(p => {
        allPayments.push({
          ...p,
          currency: p.currency || curr,
          ticketId: tData.id,
          ticketNumber: tData.ticketNumber,
          passengerName: tData.passengerName,
          pnr: tData.pnr
        });
      });
    });

    const currencies = Object.keys(totalsByCurrency);
    const primaryCurrency = currencies.includes('EGP') ? 'EGP' : (currencies[0] || 'EGP');
    const primaryTotals = totalsByCurrency[primaryCurrency] || { value: 0, paid: 0, remaining: 0 };

    const renderMetricValue = (field, textClass = '') => {
      if (currencies.length <= 1) {
        return `<div class="stat-card-value tabular-nums ${textClass}">${formatCurrency(primaryTotals[field], primaryCurrency)}</div>`;
      }
      return `
        <div class="stat-card-value tabular-nums ${textClass}">${formatCurrency(primaryTotals[field], primaryCurrency)}</div>
        <div class="d-flex flex-wrap gap-xs mt-xs text-xs text-secondary">
          ${currencies.filter(c => c !== primaryCurrency).map(c => `
            <span class="badge badge-subtle tabular-nums">${formatCurrency(totalsByCurrency[c][field], c)}</span>
          `).join('')}
        </div>
      `;
    };

    // Sort by date descending
    allPayments.sort((a, b) => new Date(b.date) - new Date(a.date));

    const headerHtml = renderPageHeader({
      title: t('payments.title'),
      subtitle: t('payments.subtitle'),
      actionsHtml: ''
    });

    const rowsHtml = allPayments.map(p => `
      <tr class="clickable-row" data-href="/tickets/${escapeHtml(p.ticketId)}?tab=payments" style="cursor: pointer;">
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
          ${renderMetricValue('value')}
          <div class="text-sm text-muted">${escapeHtml(t('dashboard.kpi.salesSubtitle'))}</div>
        </div>

        <div class="stat-card">
          <span class="stat-card-label">${escapeHtml(t('dashboard.kpi.totalCollected'))}</span>
          ${renderMetricValue('paid', 'text-success')}
          <div class="text-sm text-muted">${escapeHtml(t('dashboard.kpi.collectedSubtitle'))}</div>
        </div>

        <div class="stat-card">
          <span class="stat-card-label">${escapeHtml(t('dashboard.kpi.remainingBalance'))}</span>
          ${renderMetricValue('remaining', 'text-danger')}
          <div class="text-sm text-muted">${escapeHtml(t('dashboard.kpi.remainingSubtitle'))}</div>
        </div>
      </div>

      <!-- Main Payments Table Card -->
      <div class="card" id="payments-card-container">
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
    const cardContainer = container.querySelector('#payments-card-container');
    if (cardContainer) {
      cardContainer.addEventListener('click', (e) => {
        if (e.target.closest('a[data-link]') || e.target.closest('button')) return;
        const row = e.target.closest('tr.clickable-row[data-href]');
        if (row) {
          const href = row.getAttribute('data-href');
          if (href) {
            window.history.pushState(null, null, href);
            window.dispatchEvent(new PopStateEvent('popstate'));
          }
        }
      });
    }
  }
};

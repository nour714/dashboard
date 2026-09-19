/**
 * AfricaTravel — Refunds Management Page
 */

import { store } from '../state/store.js';
import { renderPageHeader } from '../components/page-header.js';
import { renderStatusBadge } from '../components/status-badge.js';
import { formatCurrency, formatDateTime } from '../utils/calculations.js';
import { escapeHtml } from '../utils/security.js';
import { t } from '../i18n/i18n.js';

export const RefundsPage = {
  render() {
    const { tickets = [] } = store.getState();

    const allRefunds = [];
    let completedCount = 0;
    let requestedCount = 0;
    const refundsByCurrency = {};

    tickets.forEach(tData => {
      const ticketCurr = tData.currency || 'EGP';
      (tData.refunds || []).forEach(r => {
        const curr = r.currency || ticketCurr;
        allRefunds.push({
          ...r,
          ticketId: tData.id,
          passengerName: tData.passengerName,
          pnr: tData.pnr,
          currency: curr
        });

        if (r.status === 'COMPLETED') {
          completedCount += 1;
          refundsByCurrency[curr] = (refundsByCurrency[curr] || 0) + (Number(r.amount) || 0);
        } else {
          requestedCount += 1;
        }
      });
    });

    const refundCurrencies = Object.keys(refundsByCurrency);
    const primaryCurrency = refundCurrencies.includes('EGP') ? 'EGP' : (refundCurrencies[0] || 'EGP');
    const primaryRefundTotal = refundsByCurrency[primaryCurrency] || 0;

    const renderRefundMetric = () => {
      if (refundCurrencies.length <= 1) {
        return `<div class="stat-card-value tabular-nums text-danger">${formatCurrency(primaryRefundTotal, primaryCurrency)}</div>`;
      }
      return `
        <div class="stat-card-value tabular-nums text-danger">${formatCurrency(primaryRefundTotal, primaryCurrency)}</div>
        <div class="d-flex flex-wrap gap-xs mt-xs text-xs text-secondary">
          ${refundCurrencies.filter(c => c !== primaryCurrency).map(c => `
            <span class="badge badge-subtle tabular-nums">${formatCurrency(refundsByCurrency[c], c)}</span>
          `).join('')}
        </div>
      `;
    };

    const headerHtml = renderPageHeader({
      title: t('refunds.title'),
      subtitle: t('refunds.subtitle'),
      actionsHtml: ''
    });

    const rowsHtml = allRefunds.map(r => `
      <tr class="clickable-row" data-href="/tickets/${escapeHtml(r.ticketId)}/refunds/${escapeHtml(r.id)}" style="cursor: pointer;">
        <td><strong class="cell-main ltr-data">${escapeHtml(r.id)}</strong></td>
        <td>
          <a href="/tickets/${escapeHtml(r.ticketId)}" class="cell-main text-accent ltr-data" data-link>${escapeHtml(r.ticketId)}</a>
          <div class="cell-sub font-medium">${escapeHtml(t('tickets.pnr'))}: <span class="ltr-data">${escapeHtml(r.pnr)}</span></div>
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
          <span class="text-sm font-medium">${escapeHtml(r.processedBy || t('common.agent', 'Agent'))}</span>
        </td>
      </tr>
    `).join('');

    return `
      ${headerHtml}

      <!-- Top KPI Row -->
      <div class="stat-card-grid mb-lg">
        <div class="stat-card">
          <span class="stat-card-label">${escapeHtml(t('reports.kpi.refundsTotal'))}</span>
          ${renderRefundMetric()}
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
      <div class="card" id="refunds-card-container">
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
    const cardContainer = container.querySelector('#refunds-card-container');
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

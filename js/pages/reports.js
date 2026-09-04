/**
 * AfricaTravel — Business Intelligence & Reports Page
 */

import { ReportService } from '../services/report-service.js';
import { icons } from '../components/icons.js';
import { renderPageHeader } from '../components/page-header.js';
import { showToast } from '../components/toast.js';
import { formatCurrency, formatCompactNumber } from '../utils/calculations.js';
import { escapeHtml } from '../utils/security.js';
import { t } from '../i18n/i18n.js';

export const ReportsPage = {
  render() {
    const kpis = ReportService.getKPIs();
    const customerPayments = ReportService.getCustomerPayments();

    const headerHtml = renderPageHeader({
      title: t('reports.title'),
      subtitle: t('reports.subtitle'),
      actionsHtml: `
        <div class="d-flex items-center gap-xs">
          <button type="button" class="btn btn-secondary" id="export-report-btn">
            ${icons.download('w-4 h-4')}
            <span>${escapeHtml(t('reports.exportCsv'))}</span>
          </button>
        </div>
      `
    });

    const customerPaymentRows = customerPayments.map(row => `
      <tr>
        <td>
          <strong class="cell-main">${escapeHtml(row.customerName)}</strong>
          <div class="cell-sub ltr-data">${row.ticketNumber ? escapeHtml(row.ticketNumber) : '<span class="text-muted">—</span>'}</div>
        </td>
        <td class="tabular-nums font-bold text-success">${formatCurrency(row.totalPaid, 'EGP')}</td>
        <td class="tabular-nums font-bold ${row.totalRemaining > 0 ? 'text-danger' : 'text-success'}">${formatCurrency(row.totalRemaining, 'EGP')}</td>
        <td>
          <span class="badge ${row.tripType === 'Round Trip' ? 'badge-accent' : 'badge-neutral'}">
            ${escapeHtml(row.tripType === 'Round Trip' ? t('reports.customerPayments.roundTrip') : t('reports.customerPayments.oneWay'))}
          </span>
        </td>
      </tr>
    `).join('');

    return `
      ${headerHtml}

      <!-- Sales Overview KPI Cards -->
      <div class="stat-card-grid mb-lg">
        <div class="stat-card">
          <div class="stat-card-top">
            <span class="stat-card-label">${escapeHtml(t('dashboard.kpi.totalSales'))}</span>
            <div class="stat-card-icon-wrap accent">${icons.trendingUp('w-4 h-4')}</div>
          </div>
          <div class="stat-card-value tabular-nums">${formatCompactNumber(kpis.totalSales)}</div>
          <div class="text-sm text-muted">${escapeHtml(t('dashboard.kpi.salesSubtitle'))}</div>
        </div>

        <div class="stat-card">
          <div class="stat-card-top">
            <span class="stat-card-label">${escapeHtml(t('dashboard.kpi.totalCollected'))}</span>
            <div class="stat-card-icon-wrap success">${icons.check('w-4 h-4')}</div>
          </div>
          <div class="stat-card-value tabular-nums text-success">${formatCompactNumber(kpis.totalCollected)}</div>
          <div class="text-sm text-muted">${escapeHtml(t('dashboard.kpi.collectedSubtitle'))}</div>
        </div>

        <div class="stat-card">
          <div class="stat-card-top">
            <span class="stat-card-label">${escapeHtml(t('dashboard.kpi.remainingBalance'))}</span>
            <div class="stat-card-icon-wrap warning">${icons.alertTriangle('w-4 h-4')}</div>
          </div>
          <div class="stat-card-value tabular-nums ${kpis.totalOutstanding > 0 ? 'highlight-danger' : ''}">${formatCompactNumber(kpis.totalOutstanding)}</div>
          <div class="text-sm text-muted">${escapeHtml(t('dashboard.kpi.remainingSubtitle'))}</div>
        </div>
      </div>

      <!-- Customer Payments Section -->
      <div class="card mt-lg">
        <div class="card-header">
          <h3 class="card-title">${escapeHtml(t('reports.customerPayments.title'))}</h3>
        </div>
        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>${escapeHtml(t('reports.customerPayments.customerTicket'))}</th>
                <th>${escapeHtml(t('common.paid'))}</th>
                <th>${escapeHtml(t('common.remaining'))}</th>
                <th>${escapeHtml(t('ticketCreate.flightInfo.tripType'))}</th>
              </tr>
            </thead>
            <tbody>
              ${customerPaymentRows || `<tr><td colspan="4" class="text-center text-muted p-md">${escapeHtml(t('common.noData'))}</td></tr>`}
            </tbody>
          </table>
        </div>
      </div>
    `;
  },

  afterRender(container) {
    const exportBtn = container.querySelector('#export-report-btn');
    if (exportBtn) {
      exportBtn.addEventListener('click', () => {
        showToast(t('reports.exportCsv') + '...', 'info');
      });
    }
  }
};

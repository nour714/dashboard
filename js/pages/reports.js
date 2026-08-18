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
    const employees = ReportService.getEmployeePerformance();
    const airlines = ReportService.getAirlinePerformance();

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

    const employeeRows = employees.map(e => `
      <tr>
        <td>
          <div class="d-flex items-center gap-sm">
            <div class="sidebar-user-avatar" style="width: 32px; height: 32px; font-size: 12px;">
              ${escapeHtml(e.name.split(' ').map(n => n[0]).join(''))}
            </div>
            <div>
              <strong class="cell-main">${escapeHtml(e.name)}</strong>
              <div class="cell-sub">${escapeHtml(e.title || e.role)}</div>
            </div>
          </div>
        </td>
        <td class="tabular-nums font-semibold">${e.computedTickets}</td>
        <td class="tabular-nums font-bold">${formatCurrency(e.computedSales, 'EGP')}</td>
        <td class="tabular-nums font-bold text-success">${formatCurrency(e.computedCollected, 'EGP')}</td>
      </tr>
    `).join('');

    const airlineRows = airlines.map(a => `
      <tr>
        <td>
          <div class="airline-tag">
            <span class="airline-code-badge ltr-data">${escapeHtml(a.airlineCode)}</span>
            <strong class="cell-main">${escapeHtml(a.airline)}</strong>
          </div>
        </td>
        <td class="tabular-nums font-semibold">${a.ticketsSold}</td>
        <td class="tabular-nums font-bold">${formatCurrency(a.totalRevenue, 'EGP')}</td>
        <td>
          <span class="badge badge-neutral">${escapeHtml(a.refundRate)}</span>
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

      <!-- Performance Bento Tables (6 Col + 6 Col) -->
      <div class="grid grid-cols-12 gap-lg">
        <!-- Agent Performance -->
        <div class="col-span-6">
          <div class="card">
            <div class="card-header">
              <h3 class="card-title">${escapeHtml(t('reports.agentPerformance'))}</h3>
            </div>
            <div class="table-responsive">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>${escapeHtml(t('employees.table.name'))}</th>
                    <th>${escapeHtml(t('nav.tickets'))}</th>
                    <th>${escapeHtml(t('reports.kpi.grossRevenue'))}</th>
                    <th>${escapeHtml(t('reports.kpi.netCollected'))}</th>
                  </tr>
                </thead>
                <tbody>
                  ${employeeRows || `<tr><td colspan="4" class="text-center text-muted p-md">${escapeHtml(t('common.noData'))}</td></tr>`}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <!-- Airline Performance -->
        <div class="col-span-6">
          <div class="card">
            <div class="card-header">
              <h3 class="card-title">${escapeHtml(t('reports.salesByAirline'))}</h3>
            </div>
            <div class="table-responsive">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>${escapeHtml(t('tickets.table.airline'))}</th>
                    <th>${escapeHtml(t('nav.tickets'))}</th>
                    <th>${escapeHtml(t('reports.kpi.grossRevenue'))}</th>
                    <th>${escapeHtml(t('reports.kpi.refundsTotal'))}</th>
                  </tr>
                </thead>
                <tbody>
                  ${airlineRows || `<tr><td colspan="4" class="text-center text-muted p-md">${escapeHtml(t('common.noData'))}</td></tr>`}
                </tbody>
              </table>
            </div>
          </div>
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

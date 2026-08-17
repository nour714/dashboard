/**
 * AfricaTravel — Business Intelligence & Reports Page
 */

import { ReportService } from '../services/report-service.js';
import { icons } from '../components/icons.js';
import { renderPageHeader } from '../components/page-header.js';
import { showToast } from '../components/toast.js';
import { formatCurrency, formatCompactNumber } from '../utils/calculations.js';
import { escapeHtml } from '../utils/security.js';

export const ReportsPage = {
  render() {
    const kpis = ReportService.getKPIs();
    const employees = ReportService.getEmployeePerformance();
    const airlines = ReportService.getAirlinePerformance();

    const headerHtml = renderPageHeader({
      title: 'Business Intelligence',
      subtitle: 'Performance analytics and operational financial reporting.',
      actionsHtml: `
        <div class="d-flex items-center gap-xs">
          <div class="d-flex items-center gap-xs p-xs" style="background-color: #ffffff; border: 1px solid var(--color-border-soft); border-radius: var(--radius-md); font-size: 13px; font-weight: 500;">
            ${icons.calendar('w-4 h-4 text-muted')}
            <span>Oct 1, 2023 - Oct 31, 2023</span>
          </div>
          <button type="button" class="btn btn-secondary" id="export-report-btn">
            ${icons.download('w-4 h-4')}
            <span>Export CSV</span>
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
            <span class="airline-code-badge">${escapeHtml(a.airlineCode)}</span>
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

      <!-- Sales Overview KPI Cards (5 Cards) -->
      <div class="stat-card-grid mb-lg">
        <div class="stat-card">
          <div class="stat-card-top">
            <span class="stat-card-label">TOTAL SALES</span>
            <div class="stat-card-icon-wrap accent">${icons.trendingUp('w-4 h-4')}</div>
          </div>
          <div class="stat-card-value tabular-nums">${formatCompactNumber(kpis.totalSales)}</div>
          <div class="trend-indicator positive">${icons.trendingUp('w-3 h-3')} +12.4% vs last month</div>
        </div>

        <div class="stat-card">
          <div class="stat-card-top">
            <span class="stat-card-label">COLLECTED</span>
            <div class="stat-card-icon-wrap success">${icons.check('w-4 h-4')}</div>
          </div>
          <div class="stat-card-value tabular-nums text-success">${formatCompactNumber(kpis.totalCollected)}</div>
          <div class="trend-indicator positive">${icons.trendingUp('w-3 h-3')} +8.2% vs last month</div>
        </div>

        <div class="stat-card">
          <div class="stat-card-top">
            <span class="stat-card-label">OUTSTANDING</span>
            <div class="stat-card-icon-wrap warning">${icons.alertTriangle('w-4 h-4')}</div>
          </div>
          <div class="stat-card-value tabular-nums ${kpis.totalOutstanding > 0 ? 'highlight-danger' : ''}">${formatCompactNumber(kpis.totalOutstanding)}</div>
          <div class="trend-indicator negative">${icons.trendingUp('w-3 h-3')} +4.1% vs last month</div>
        </div>

        <div class="stat-card">
          <div class="stat-card-top">
            <span class="stat-card-label">REFUNDED</span>
            <div class="stat-card-icon-wrap danger">${icons.refunds('w-4 h-4')}</div>
          </div>
          <div class="stat-card-value tabular-nums text-danger">${formatCompactNumber(kpis.totalRefunds)}</div>
          <div class="trend-indicator positive" style="color: var(--color-success);">${icons.trendingDown('w-3 h-3')} -2.5% vs last month</div>
        </div>

        <div class="stat-card" style="border-left: 4px solid var(--color-accent);">
          <div class="stat-card-top">
            <span class="stat-card-label">NET VALUE</span>
            <div class="stat-card-icon-wrap accent">${icons.dollarSign('w-4 h-4')}</div>
          </div>
          <div class="stat-card-value tabular-nums text-accent">${formatCompactNumber(kpis.netValue)}</div>
          <div class="text-xs text-muted">Total Sales - Refunds</div>
        </div>
      </div>

      <!-- Visual Charts Grid (2 Columns) -->
      <div class="grid grid-cols-2 gap-lg mb-lg form-grid-2">
        <!-- Monthly Sales vs Collections Bar Chart -->
        <div class="card">
          <div class="card-header">
            <h3 class="card-title">Monthly Sales vs Collections</h3>
          </div>
          <div class="card-body">
            <div style="height: 220px; display: flex; align-items: flex-end; justify-content: space-around; padding-bottom: 20px; border-bottom: 1px solid var(--color-border-soft); gap: 12px;">
              <!-- Week 1 -->
              <div class="d-flex flex-column items-center gap-xs" style="flex: 1;">
                <div class="d-flex items-end gap-xxs" style="height: 160px;">
                  <div style="width: 22px; height: 110px; background-color: #dbeafe; border-radius: 4px 4px 0 0;" title="Sales: 110K"></div>
                  <div style="width: 22px; height: 95px; background-color: #2563eb; border-radius: 4px 4px 0 0;" title="Collections: 95K"></div>
                </div>
                <span class="text-xs text-muted font-medium">Oct 1-7</span>
              </div>

              <!-- Week 2 -->
              <div class="d-flex flex-column items-center gap-xs" style="flex: 1;">
                <div class="d-flex items-end gap-xxs" style="height: 160px;">
                  <div style="width: 22px; height: 140px; background-color: #dbeafe; border-radius: 4px 4px 0 0;" title="Sales: 140K"></div>
                  <div style="width: 22px; height: 125px; background-color: #2563eb; border-radius: 4px 4px 0 0;" title="Collections: 125K"></div>
                </div>
                <span class="text-xs text-muted font-medium">Oct 8-14</span>
              </div>

              <!-- Week 3 -->
              <div class="d-flex flex-column items-center gap-xs" style="flex: 1;">
                <div class="d-flex items-end gap-xxs" style="height: 160px;">
                  <div style="width: 22px; height: 160px; background-color: #dbeafe; border-radius: 4px 4px 0 0;" title="Sales: 160K"></div>
                  <div style="width: 22px; height: 145px; background-color: #2563eb; border-radius: 4px 4px 0 0;" title="Collections: 145K"></div>
                </div>
                <span class="text-xs text-muted font-medium">Oct 15-21</span>
              </div>

              <!-- Week 4 -->
              <div class="d-flex flex-column items-center gap-xs" style="flex: 1;">
                <div class="d-flex items-end gap-xxs" style="height: 160px;">
                  <div style="width: 22px; height: 130px; background-color: #dbeafe; border-radius: 4px 4px 0 0;" title="Sales: 130K"></div>
                  <div style="width: 22px; height: 130px; background-color: #2563eb; border-radius: 4px 4px 0 0;" title="Collections: 130K"></div>
                </div>
                <span class="text-xs text-muted font-medium">Oct 22-31</span>
              </div>
            </div>

            <div class="d-flex justify-center items-center gap-lg mt-md text-xs font-semibold">
              <div class="d-flex items-center gap-xs">
                <span style="width: 12px; height: 12px; background-color: #dbeafe; border-radius: 2px;"></span>
                <span>Sales Billed</span>
              </div>
              <div class="d-flex items-center gap-xs">
                <span style="width: 12px; height: 12px; background-color: #2563eb; border-radius: 2px;"></span>
                <span>Collections Received</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Refunds & Outstanding Balance Area Chart -->
        <div class="card">
          <div class="card-header">
            <h3 class="card-title">Refunds & Outstanding Balance</h3>
          </div>
          <div class="card-body">
            <div style="height: 220px; position: relative;">
              <!-- SVG Area Chart -->
              <svg viewBox="0 0 400 160" preserveAspectRatio="none" style="width: 100%; height: 160px; overflow: visible;">
                <defs>
                  <linearGradient id="outstandingGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stop-color="#fef3c7" stop-opacity="0.8"/>
                    <stop offset="100%" stop-color="#fef3c7" stop-opacity="0.1"/>
                  </linearGradient>
                  <linearGradient id="refundsGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stop-color="#ffdad6" stop-opacity="0.8"/>
                    <stop offset="100%" stop-color="#ffdad6" stop-opacity="0.1"/>
                  </linearGradient>
                </defs>

                <!-- Grid horizontal lines -->
                <line x1="0" y1="40" x2="400" y2="40" stroke="#e2e8f0" stroke-dasharray="4"/>
                <line x1="0" y1="80" x2="400" y2="80" stroke="#e2e8f0" stroke-dasharray="4"/>
                <line x1="0" y1="120" x2="400" y2="120" stroke="#e2e8f0" stroke-dasharray="4"/>

                <!-- Area Outstanding -->
                <path d="M0,120 Q100,70 200,90 T400,60 L400,160 L0,160 Z" fill="url(#outstandingGrad)"/>
                <path d="M0,120 Q100,70 200,90 T400,60" fill="none" stroke="#d97706" stroke-width="2"/>

                <!-- Area Refunds -->
                <path d="M0,140 Q100,120 200,135 T400,110 L400,160 L0,160 Z" fill="url(#refundsGrad)"/>
                <path d="M0,140 Q100,120 200,135 T400,110" fill="none" stroke="#ba1a1a" stroke-width="2"/>
              </svg>

              <div class="d-flex justify-between text-xs text-muted mt-xs">
                <span>W1</span>
                <span>W2</span>
                <span>W3</span>
                <span>W4</span>
              </div>
            </div>

            <div class="d-flex justify-center items-center gap-lg mt-md text-xs font-semibold">
              <div class="d-flex items-center gap-xs">
                <span style="width: 12px; height: 12px; background-color: #d97706; border-radius: 2px;"></span>
                <span>Outstanding</span>
              </div>
              <div class="d-flex items-center gap-xs">
                <span style="width: 12px; height: 12px; background-color: #ba1a1a; border-radius: 2px;"></span>
                <span>Refunds</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Performance Tables (2 Columns) -->
      <div class="grid grid-cols-2 gap-lg form-grid-2">
        <!-- Employee Performance -->
        <div class="card">
          <div class="card-header">
            <h3 class="card-title">Employee Performance</h3>
          </div>
          <div class="table-responsive">
            <table class="data-table">
              <thead>
                <tr>
                  <th>EMPLOYEE</th>
                  <th>TICKETS</th>
                  <th>SALES</th>
                  <th>COLLECTED</th>
                </tr>
              </thead>
              <tbody>
                ${employeeRows}
              </tbody>
            </table>
          </div>
        </div>

        <!-- Airline Performance -->
        <div class="card">
          <div class="card-header">
            <h3 class="card-title">Airline Performance</h3>
          </div>
          <div class="table-responsive">
            <table class="data-table">
              <thead>
                <tr>
                  <th>AIRLINE</th>
                  <th>TICKETS SOLD</th>
                  <th>REVENUE</th>
                  <th>REFUND RATE</th>
                </tr>
              </thead>
              <tbody>
                ${airlineRows}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;
  },

  afterRender(container) {
    const exportBtn = container.querySelector('#export-report-btn');
    if (exportBtn) {
      exportBtn.addEventListener('click', () => {
        showToast('Exporting business intelligence report...', 'info');
        setTimeout(() => showToast('Report exported (report-bi-oct.csv)', 'success'), 1200);
      });
    }
  }
};

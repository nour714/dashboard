/**
 * AfricaTravel — Dashboard Page
 */

import { store } from '../state/store.js';
import { icons } from '../components/icons.js';
import { renderStatCard } from '../components/stat-card.js';
import { renderStatusBadge } from '../components/status-badge.js';
import {
  calculateTotalPaid,
  calculateRemaining,
  formatCurrency,
  formatCompactNumber,
  formatDateTime,
  formatRelativeTime
} from '../utils/calculations.js';
import { escapeHtml } from '../utils/security.js';
import { t } from '../i18n/i18n.js';

export const DashboardPage = {
  render() {
    const { tickets, activityLogs } = store.getState();

    // Compute KPIs
    let totalTickets = tickets.length;
    let totalSales = 0;
    let totalCollected = 0;
    let totalOutstanding = 0;

    tickets.forEach(tk => {
      const price = Number(tk.ticketPrice) || 0;
      totalSales += price;
      const paid = calculateTotalPaid(tk.payments);
      totalCollected += paid;
      totalOutstanding += calculateRemaining(price, paid);
    });

    const collectionRate = totalSales > 0 ? Math.round((totalCollected / totalSales) * 100) : 0;

    // Recent Tickets (Top 5)
    const recentTickets = tickets.slice(0, 5);

    // Upcoming Flights (Next 3)
    const upcomingFlights = tickets
      .filter(tk => tk.status !== 'CANCELLED' && tk.status !== 'REFUNDED')
      .slice(0, 3);

    // Recent Activities (Top 5)
    const recentActivities = activityLogs.slice(0, 5);

    const recentTicketsHtml = recentTickets.map(tk => {
      const totalPaid = calculateTotalPaid(tk.payments);
      const remaining = calculateRemaining(tk.ticketPrice, totalPaid);
      const isPaid = remaining === 0;

      return `
        <tr>
          <td>
            <a href="/tickets/${escapeHtml(tk.id)}" class="cell-main ltr-data" data-link>${escapeHtml(tk.id)}</a>
            <div class="cell-sub">${formatDateTime(tk.createdAt)}</div>
          </td>
          <td>
            <div class="cell-main">${escapeHtml(tk.passengerName)}</div>
            <div class="cell-sub ltr-data">${escapeHtml(tk.phone || tk.email || 'Direct Client')}</div>
          </td>
          <td>
            <div class="airline-tag">
              <span class="airline-code-badge ltr-data">${escapeHtml(tk.airlineCode || 'MS')}</span>
              <span class="ltr-data">${escapeHtml(tk.origin)} ✈ ${escapeHtml(tk.destination)}</span>
            </div>
          </td>
          <td>
            <div class="tabular-nums font-semibold">${formatCurrency(tk.ticketPrice, tk.currency)}</div>
            <div class="cell-sub ${isPaid ? 'text-success' : 'text-danger'}">
              ${isPaid ? `${escapeHtml(t('common.paid'))}: ${formatCurrency(totalPaid, tk.currency)}` : `${escapeHtml(t('common.remaining'))}: ${formatCurrency(remaining, tk.currency)}`}
            </div>
          </td>
          <td>
            ${renderStatusBadge(tk.status)}
          </td>
        </tr>
      `;
    }).join('');

    const upcomingFlightsHtml = upcomingFlights.map(tk => `
      <div class="d-flex items-center justify-between p-sm mb-xs" style="background-color: var(--color-surface); border: 1px solid var(--color-border-soft); border-radius: var(--radius-lg);">
        <div class="d-flex items-center gap-sm">
          <div style="width: 38px; height: 38px; border-radius: var(--radius-md); background: #e0f2fe; color: #0284c7; display: flex; align-items: center; justify-content: center;">
            ${icons.airplane('w-4 h-4')}
          </div>
          <div>
            <div class="font-semibold ltr-data" style="font-size: 14px;">
              ${escapeHtml(tk.origin)} ✈ ${escapeHtml(tk.destination)}
            </div>
            <div class="text-sm text-muted">
              <span class="ltr-data">${escapeHtml(tk.flightNumber || 'MS 901')}</span> • ${escapeHtml(tk.passengerName)}
            </div>
          </div>
        </div>
        <div class="text-end">
          <span class="airline-code-badge ltr-data">${escapeHtml(tk.pnr)}</span>
          <div class="mt-xs">${renderStatusBadge(tk.status)}</div>
        </div>
      </div>
    `).join('');

    const recentActivitiesHtml = recentActivities.map(a => `
      <div class="d-flex gap-sm mb-md" style="position: relative;">
        <div style="width: 10px; height: 10px; border-radius: var(--radius-full); background-color: var(--color-accent); margin-top: 5px; flex-shrink: 0;"></div>
        <div style="flex: 1;">
          <div style="font-size: 13px; color: var(--color-text);">
            <strong style="font-family: var(--font-family-heading);">${escapeHtml(a.user)}</strong> ${escapeHtml(a.description)}
          </div>
          <div class="text-sm text-muted mt-xs">
            ${formatRelativeTime(a.timestamp)}
          </div>
        </div>
      </div>
    `).join('');

    return `
      <!-- KPI Row -->
      <div class="stat-card-grid">
        ${renderStatCard({
          label: t('dashboard.kpi.activeTickets'),
          value: totalTickets,
          icon: 'ticket',
          iconStyle: 'accent',
          subtext: t('dashboard.kpi.activeSubtitle')
        })}

        ${renderStatCard({
          label: t('dashboard.kpi.totalSales'),
          value: formatCurrency(totalSales),
          icon: 'dollarSign',
          iconStyle: 'accent',
          subtext: t('dashboard.kpi.salesSubtitle')
        })}

        ${renderStatCard({
          label: t('dashboard.kpi.totalCollected'),
          value: formatCurrency(totalCollected),
          icon: 'check',
          iconStyle: 'success',
          progress: collectionRate,
          subtext: `${collectionRate}% ${t('common.paid')}`
        })}

        ${renderStatCard({
          label: t('dashboard.kpi.remainingBalance'),
          value: formatCurrency(totalOutstanding),
          icon: 'alertTriangle',
          iconStyle: 'danger',
          alertPill: totalOutstanding > 0 ? (totalOutstanding > 0 ? t('common.remaining') : '') : '',
          subtext: t('dashboard.kpi.remainingSubtitle')
        })}
      </div>

      <!-- Bento Grid (8 Col + 4 Col) -->
      <div class="grid grid-cols-12 gap-lg dashboard-grid">
        <!-- Left Area: Recent Tickets -->
        <div class="col-span-8">
          <div class="card">
            <div class="card-header">
              <h2 class="card-title">${escapeHtml(t('dashboard.recentTickets.title'))}</h2>
              <a href="/tickets" class="btn btn-sm btn-ghost" data-link>${escapeHtml(t('common.viewAll'))}</a>
            </div>
            <div class="table-responsive">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>${escapeHtml(t('tickets.table.ticketNumber'))}</th>
                    <th>${escapeHtml(t('tickets.table.passenger'))}</th>
                    <th>${escapeHtml(t('tickets.table.route'))}</th>
                    <th>${escapeHtml(t('tickets.table.price'))}</th>
                    <th>${escapeHtml(t('tickets.table.status'))}</th>
                  </tr>
                </thead>
                <tbody>
                  ${recentTicketsHtml}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <!-- Right Area: Upcoming Flights & Recent Activity -->
        <div class="col-span-4 d-flex flex-column gap-lg">
          <!-- Upcoming Flights -->
          <div class="card">
            <div class="card-header">
              <h3 class="card-title">${escapeHtml(t('ticketCreate.flightInfo.title'))}</h3>
            </div>
            <div class="card-body p-sm">
              ${upcomingFlightsHtml || `<p class="text-sm text-muted p-sm">${escapeHtml(t('common.noData'))}</p>`}
            </div>
          </div>

          <!-- Recent Activity -->
          <div class="card">
            <div class="card-header">
              <h3 class="card-title">${escapeHtml(t('dashboard.recentActivity.title'))}</h3>
              <a href="/activity" class="btn btn-sm btn-ghost" data-link>${escapeHtml(t('nav.activity'))}</a>
            </div>
            <div class="card-body">
              ${recentActivitiesHtml}
            </div>
          </div>
        </div>
      </div>
    `;
  },

  afterRender(container) {
    // Dynamic bindings if any
  }
};

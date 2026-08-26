/**
 * AfricaTravel — Tickets Management Page
 */

import { TicketService } from '../services/ticket-service.js';
import { icons } from '../components/icons.js';
import { renderPageHeader } from '../components/page-header.js';
import { renderStatusBadge } from '../components/status-badge.js';
import { renderEmptyState } from '../components/empty-state.js';
import { showToast } from '../components/toast.js';
import {
  calculateTotalPaid,
  calculateRemaining,
  formatCurrency,
  formatDate
} from '../utils/calculations.js';
import { escapeHtml } from '../utils/security.js';
import { t, i18n } from '../i18n/i18n.js';

let currentFilters = {
  search: '',
  status: 'All Statuses',
  airline: 'All Airlines',
  travelDate: ''
};

function renderTicketRows(tickets) {
  if (tickets.length === 0) return '';
  return tickets.map(tData => {
    const totalPaid = calculateTotalPaid(tData.payments);
    const remaining = calculateRemaining(tData.ticketPrice, totalPaid);
    const isPaid = remaining === 0;

    return `
      <tr>
        <td>
          <a href="/tickets/${escapeHtml(tData.id)}" class="cell-main ltr-data" data-link>${escapeHtml(tData.ticketNumber)}</a>
          <div class="cell-sub font-medium">PNR: <strong class="ltr-data" style="color: var(--color-primary);">${escapeHtml(tData.pnr)}</strong></div>
        </td>
        <td>
          <div class="cell-main">${escapeHtml(tData.passengerName)}</div>
          <div class="cell-sub ltr-data">${escapeHtml(tData.phone || tData.email || '--')}</div>
        </td>
        <td>
          <div class="airline-tag">
            <span class="airline-code-badge ltr-data">${escapeHtml(tData.airlineCode || 'MS')}</span>
            <span>${escapeHtml(tData.airline)}</span>
          </div>
          <div class="cell-sub ltr-data">${escapeHtml(tData.origin)} ✈ ${escapeHtml(tData.destination)}</div>
        </td>
        <td>
          <div class="tabular-nums font-medium">${formatDate(tData.departureDate)}</div>
        </td>
        <td>
          <div class="tabular-nums font-semibold">${formatCurrency(tData.ticketPrice, tData.currency)}</div>
        </td>
        <td>
          <div class="tabular-nums font-semibold ${isPaid ? 'text-success' : 'text-danger'}">
            ${isPaid ? formatCurrency(0, tData.currency) : formatCurrency(remaining, tData.currency)}
          </div>
          <div class="cell-sub">${escapeHtml(t('common.paid'))}: ${formatCurrency(totalPaid, tData.currency)}</div>
        </td>
        <td>
          ${renderStatusBadge(tData.status)}
        </td>
      </tr>
    `;
  }).join('');
}

function renderMobileCards(tickets) {
  if (tickets.length === 0) return '';
  return tickets.map(tData => {
    const totalPaid = calculateTotalPaid(tData.payments);
    const remaining = calculateRemaining(tData.ticketPrice, totalPaid);

    return `
      <a href="/tickets/${escapeHtml(tData.id)}" class="mobile-data-card" data-link>
        <div class="mobile-card-top">
          <span class="mobile-card-id ltr-data">#${escapeHtml(tData.id)}</span>
          ${renderStatusBadge(tData.status)}
        </div>
        <div class="font-bold" style="font-size: 16px;">${escapeHtml(tData.passengerName)}</div>
        <div class="mobile-card-route">
          <span class="ltr-data">${escapeHtml(tData.airlineCode || 'MS')}</span>
          <span class="ltr-data">${escapeHtml(tData.origin)} ✈ ${escapeHtml(tData.destination)}</span>
        </div>
        <div class="text-sm text-muted">
          PNR: <strong class="ltr-data">${escapeHtml(tData.pnr)}</strong> • ${formatDate(tData.departureDate)}
        </div>
        <div class="mobile-card-meta">
          <div>
            <div class="text-sm text-muted">${escapeHtml(t('common.price'))} / ${escapeHtml(t('common.remaining'))}</div>
            <div class="font-semibold tabular-nums">${formatCurrency(tData.ticketPrice, tData.currency)} (${formatCurrency(remaining, tData.currency)})</div>
          </div>
          <span class="text-accent font-semibold text-sm">${escapeHtml(t('common.details'))} ›</span>
        </div>
      </a>
    `;
  }).join('');
}

function exportTicketsToCsv(tickets) {
  const headers = ['Ticket Number', 'PNR', 'Passenger', 'Airline', 'Origin', 'Destination', 'Departure Date', 'Price', 'Paid', 'Remaining', 'Status'];
  const rows = tickets.map(t => {
    const financials = TicketService.getTicketFinancials(t);
    return [
      t.ticketNumber,
      t.pnr,
      t.passengerName,
      t.airline,
      t.origin,
      t.destination,
      t.departureDate ? formatDate(t.departureDate) : '',
      t.ticketPrice,
      financials ? financials.totalPaid : 0,
      financials ? financials.remaining : 0,
      t.status
    ];
  });

  const csvContent = [headers, ...rows]
    .map(row => row.map(cell => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(','))
    .join('\n');

  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `africatravel-tickets-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export const TicketsPage = {
  render(params, query) {
    if (query && query.q) {
      currentFilters.search = query.q;
    }

    const tickets = TicketService.getAllTickets(currentFilters);

    const headerHtml = renderPageHeader({
      title: t('tickets.title'),
      subtitle: t('tickets.subtitle'),
      actionsHtml: `
        <button type="button" class="btn btn-secondary" id="export-tickets-btn">
          ${icons.download('w-4 h-4')}
          <span>${escapeHtml(t('common.export'))}</span>
        </button>
        <a href="/tickets/new" class="btn btn-primary" data-link>
          ${icons.plus('w-4 h-4')}
          <span>${escapeHtml(t('tickets.createTicket'))}</span>
        </a>
      `
    });

    return `
      ${headerHtml}

      <!-- Filter Controls -->
      <div class="filter-bar">
        <div class="view-search-box flex-1">
          ${icons.search()}
          <input
            type="search"
            class="form-control"
            id="ticket-search-input"
            placeholder="${escapeHtml(t('tickets.searchPlaceholder'))}"
            value="${escapeHtml(currentFilters.search)}"
            autocomplete="off"
          />
        </div>

        <div class="filter-item">
          <label class="text-sm text-muted" for="ticket-status-filter">${escapeHtml(t('tickets.filterStatus'))}</label>
          <select class="form-control" id="ticket-status-filter" style="min-width: 140px;">
            <option value="All Statuses" ${currentFilters.status === 'All Statuses' ? 'selected' : ''}>${escapeHtml(t('common.all'))}</option>
            <option value="CONFIRMED" ${currentFilters.status === 'CONFIRMED' ? 'selected' : ''}>${escapeHtml(i18n.translateStatus('CONFIRMED'))}</option>
            <option value="PARTIALLY PAID" ${currentFilters.status === 'PARTIALLY PAID' ? 'selected' : ''}>${escapeHtml(i18n.translateStatus('PARTIALLY PAID'))}</option>
            <option value="PAID" ${currentFilters.status === 'PAID' ? 'selected' : ''}>${escapeHtml(i18n.translateStatus('PAID'))}</option>
            <option value="CANCELLED" ${currentFilters.status === 'CANCELLED' ? 'selected' : ''}>${escapeHtml(i18n.translateStatus('CANCELLED'))}</option>
            <option value="REFUNDED" ${currentFilters.status === 'REFUNDED' ? 'selected' : ''}>${escapeHtml(i18n.translateStatus('REFUNDED'))}</option>
          </select>
        </div>

        <div class="filter-item">
          <label class="text-sm text-muted" for="ticket-airline-filter">${escapeHtml(t('tickets.filterAirline'))}</label>
          <select class="form-control" id="ticket-airline-filter" style="min-width: 150px;">
            <option value="All Airlines" ${currentFilters.airline === 'All Airlines' ? 'selected' : ''}>${escapeHtml(t('common.all'))}</option>
            <option value="EgyptAir" ${currentFilters.airline === 'EgyptAir' ? 'selected' : ''}>EgyptAir (مصر للطيران)</option>
            <option value="Emirates" ${currentFilters.airline === 'Emirates' ? 'selected' : ''}>Emirates (طيران الإمارات)</option>
            <option value="Qatar Airways" ${currentFilters.airline === 'Qatar Airways' ? 'selected' : ''}>Qatar Airways (القطرية)</option>
            <option value="British Airways" ${currentFilters.airline === 'British Airways' ? 'selected' : ''}>British Airways (البريطانية)</option>
          </select>
        </div>

        <div class="filter-item">
          <label class="text-sm text-muted" for="ticket-date-filter">${escapeHtml(t('tickets.table.travelDate'))}</label>
          <input
            type="date"
            class="form-control"
            id="ticket-date-filter"
            value="${escapeHtml(currentFilters.travelDate)}"
            style="width: 160px;"
          />
        </div>

        <button type="button" class="btn btn-sm btn-ghost text-danger" id="clear-filters-btn" style="display: ${(currentFilters.search || currentFilters.status !== 'All Statuses' || currentFilters.airline !== 'All Airlines' || currentFilters.travelDate) ? 'inline-flex' : 'none'};">
          ${escapeHtml(t('common.reset'))}
        </button>
      </div>

      <!-- Desktop Table / Mobile Card View Container -->
      <div class="card" id="tickets-card-container">
        ${this.renderCardContent(tickets)}
      </div>
    `;
  },

  renderCardContent(tickets) {
    if (tickets.length === 0) {
      return renderEmptyState({
        title: t('tickets.empty.title'),
        description: t('tickets.empty.description'),
        icon: 'ticket',
        actionText: t('common.reset'),
        actionId: 'reset-empty-filters-btn'
      });
    }

    return `
      <!-- Desktop Table -->
      <div class="table-responsive desktop-table-view">
        <table class="data-table">
          <thead>
            <tr>
              <th>${escapeHtml(t('tickets.table.ticketNumber'))} / PNR</th>
              <th>${escapeHtml(t('tickets.table.passenger'))}</th>
              <th>${escapeHtml(t('tickets.table.airline'))} & ${escapeHtml(t('tickets.table.route'))}</th>
              <th>${escapeHtml(t('tickets.table.travelDate'))}</th>
              <th>${escapeHtml(t('tickets.table.price'))}</th>
              <th>${escapeHtml(t('tickets.table.remaining'))}</th>
              <th>${escapeHtml(t('tickets.table.status'))}</th>
            </tr>
          </thead>
          <tbody id="tickets-table-tbody">
            ${renderTicketRows(tickets)}
          </tbody>
        </table>
      </div>

      <!-- Mobile Cards -->
      <div class="mobile-card-list mobile-card-view p-sm" id="tickets-mobile-list" style="display: none;">
        ${renderMobileCards(tickets)}
      </div>

      <!-- Pagination -->
      <div class="pagination-wrap">
        <span id="tickets-count-label">${escapeHtml(t('common.showing'))} <strong>1-${tickets.length}</strong> ${escapeHtml(t('common.of'))} <strong>${tickets.length}</strong> ${escapeHtml(t('common.results'))}</span>
        <div class="pagination-controls">
          <button class="pagination-btn icon-directional" disabled>‹</button>
          <button class="pagination-btn active">1</button>
          <button class="pagination-btn icon-directional" disabled>›</button>
        </div>
      </div>
    `;
  },

  afterRender(container) {
    const searchInput = container.querySelector('#ticket-search-input');
    const statusFilter = container.querySelector('#ticket-status-filter');
    const airlineFilter = container.querySelector('#ticket-airline-filter');
    const dateFilter = container.querySelector('#ticket-date-filter');
    const clearBtn = container.querySelector('#clear-filters-btn');
    const cardContainer = container.querySelector('#tickets-card-container');
    const exportBtn = container.querySelector('#export-tickets-btn');

    const updateResults = () => {
      const tickets = TicketService.getAllTickets(currentFilters);
      if (cardContainer) {
        cardContainer.innerHTML = TicketsPage.renderCardContent(tickets);
        const resetEmpty = cardContainer.querySelector('#reset-empty-filters-btn');
        if (resetEmpty) {
          resetEmpty.addEventListener('click', resetFilters);
        }
      }

      const hasFilters = currentFilters.search || currentFilters.status !== 'All Statuses' || currentFilters.airline !== 'All Airlines' || currentFilters.travelDate;
      if (clearBtn) {
        clearBtn.style.display = hasFilters ? 'inline-flex' : 'none';
      }
    };

    const resetFilters = () => {
      currentFilters = { search: '', status: 'All Statuses', airline: 'All Airlines', travelDate: '' };
      if (searchInput) searchInput.value = '';
      if (statusFilter) statusFilter.value = 'All Statuses';
      if (airlineFilter) airlineFilter.value = 'All Airlines';
      if (dateFilter) dateFilter.value = '';
      updateResults();
    };

    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        currentFilters.search = e.target.value;
        updateResults();
      });
    }

    if (statusFilter) {
      statusFilter.addEventListener('change', (e) => {
        currentFilters.status = e.target.value;
        updateResults();
      });
    }

    if (airlineFilter) {
      airlineFilter.addEventListener('change', (e) => {
        currentFilters.airline = e.target.value;
        updateResults();
      });
    }

    if (dateFilter) {
      dateFilter.addEventListener('change', (e) => {
        currentFilters.travelDate = e.target.value;
        updateResults();
      });
    }

    if (clearBtn) clearBtn.addEventListener('click', resetFilters);

    if (exportBtn) {
      exportBtn.addEventListener('click', () => {
        const tickets = TicketService.getAllTickets(currentFilters);
        if (!tickets || tickets.length === 0) {
          showToast(t('common.noDataToExport') || 'No data to export', 'warning');
          return;
        }
        exportTicketsToCsv(tickets);
        showToast(t('common.exportSuccess') || 'Exported successfully', 'success');
      });
    }
  }
};

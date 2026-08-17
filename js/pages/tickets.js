/**
 * AfriciaTravel — Tickets Management Page
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
  formatDate,
  formatDateTime
} from '../utils/calculations.js';

let currentFilters = {
  search: '',
  status: 'All Statuses',
  airline: 'All Airlines',
  travelDate: ''
};

function renderTicketRows(tickets) {
  if (tickets.length === 0) return '';
  return tickets.map(t => {
    const totalPaid = calculateTotalPaid(t.payments);
    const remaining = calculateRemaining(t.ticketPrice, totalPaid);
    const isPaid = remaining === 0;

    return `
      <tr>
        <td>
          <a href="/tickets/${t.id}" class="cell-main" data-link>${t.ticketNumber}</a>
          <div class="cell-sub font-medium">PNR: <strong style="color: var(--color-primary);">${t.pnr}</strong></div>
        </td>
        <td>
          <div class="cell-main">${t.passengerName}</div>
          <div class="cell-sub">${t.phone || t.email || '—'}</div>
        </td>
        <td>
          <div class="airline-tag">
            <span class="airline-code-badge">${t.airlineCode || 'MS'}</span>
            <span>${t.airline}</span>
          </div>
          <div class="cell-sub">${t.origin} ✈ ${t.destination}</div>
        </td>
        <td>
          <div class="tabular-nums font-medium">${formatDate(t.departureDate)}</div>
          <div class="cell-sub">${t.departureDate ? new Date(t.departureDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }) : ''}</div>
        </td>
        <td>
          <div class="tabular-nums font-semibold">${formatCurrency(t.ticketPrice, t.currency)}</div>
        </td>
        <td>
          <div class="tabular-nums font-semibold ${isPaid ? 'text-success' : 'text-danger'}">
            ${isPaid ? `EGP 0` : formatCurrency(remaining, t.currency)}
          </div>
          <div class="cell-sub">Paid: ${formatCurrency(totalPaid, t.currency)}</div>
        </td>
        <td>
          ${renderStatusBadge(t.status)}
        </td>
      </tr>
    `;
  }).join('');
}

function renderMobileCards(tickets) {
  if (tickets.length === 0) return '';
  return tickets.map(t => {
    const totalPaid = calculateTotalPaid(t.payments);
    const remaining = calculateRemaining(t.ticketPrice, totalPaid);

    return `
      <a href="/tickets/${t.id}" class="mobile-data-card" data-link>
        <div class="mobile-card-top">
          <span class="mobile-card-id">#${t.id}</span>
          ${renderStatusBadge(t.status)}
        </div>
        <div class="font-bold" style="font-size: 16px;">${t.passengerName}</div>
        <div class="mobile-card-route">
          <span>${t.airlineCode || 'MS'}</span>
          <span>${t.origin} → ${t.destination}</span>
        </div>
        <div class="text-sm text-muted">
          PNR: <strong>${t.pnr}</strong> • ${formatDate(t.departureDate)}
        </div>
        <div class="mobile-card-meta">
          <div>
            <div class="text-sm text-muted">Price / Balance</div>
            <div class="font-semibold tabular-nums">${formatCurrency(t.ticketPrice, t.currency)} (${formatCurrency(remaining, t.currency)} rem)</div>
          </div>
          <span class="text-accent font-semibold text-sm">Manage ›</span>
        </div>
      </a>
    `;
  }).join('');
}

export const TicketsPage = {
  render(params, query) {
    if (query && query.q) {
      currentFilters.search = query.q;
    }

    const tickets = TicketService.getAllTickets(currentFilters);

    const headerHtml = renderPageHeader({
      title: 'Tickets',
      subtitle: 'Manage and monitor all airline tickets.',
      actionsHtml: `
        <button type="button" class="btn btn-secondary" id="export-tickets-btn">
          ${icons.download('w-4 h-4')}
          <span>Export</span>
        </button>
        <a href="/tickets/new" class="btn btn-primary" data-link>
          ${icons.plus('w-4 h-4')}
          <span>New Ticket</span>
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
            placeholder="Search by PNR, Ticket #, or Customer..."
            value="${currentFilters.search}"
            autocomplete="off"
          />
        </div>

        <div class="filter-item">
          <label class="text-sm text-muted" for="ticket-status-filter">STATUS</label>
          <select class="form-control" id="ticket-status-filter" style="width: 150px;">
            <option value="All Statuses" ${currentFilters.status === 'All Statuses' ? 'selected' : ''}>All Statuses</option>
            <option value="CONFIRMED" ${currentFilters.status === 'CONFIRMED' ? 'selected' : ''}>CONFIRMED</option>
            <option value="PARTIALLY PAID" ${currentFilters.status === 'PARTIALLY PAID' ? 'selected' : ''}>PARTIALLY PAID</option>
            <option value="PAID" ${currentFilters.status === 'PAID' ? 'selected' : ''}>PAID</option>
            <option value="CANCELLED" ${currentFilters.status === 'CANCELLED' ? 'selected' : ''}>CANCELLED</option>
            <option value="REFUNDED" ${currentFilters.status === 'REFUNDED' ? 'selected' : ''}>REFUNDED</option>
          </select>
        </div>

        <div class="filter-item">
          <label class="text-sm text-muted" for="ticket-airline-filter">AIRLINE</label>
          <select class="form-control" id="ticket-airline-filter" style="width: 160px;">
            <option value="All Airlines" ${currentFilters.airline === 'All Airlines' ? 'selected' : ''}>All Airlines</option>
            <option value="EgyptAir" ${currentFilters.airline === 'EgyptAir' ? 'selected' : ''}>EgyptAir</option>
            <option value="Emirates" ${currentFilters.airline === 'Emirates' ? 'selected' : ''}>Emirates</option>
            <option value="Qatar Airways" ${currentFilters.airline === 'Qatar Airways' ? 'selected' : ''}>Qatar Airways</option>
            <option value="British Airways" ${currentFilters.airline === 'British Airways' ? 'selected' : ''}>British Airways</option>
          </select>
        </div>

        <div class="filter-item">
          <label class="text-sm text-muted" for="ticket-date-filter">TRAVEL DATE</label>
          <input
            type="date"
            class="form-control"
            id="ticket-date-filter"
            value="${currentFilters.travelDate}"
            style="width: 160px;"
          />
        </div>

        <button type="button" class="btn btn-sm btn-ghost text-danger" id="clear-filters-btn" style="display: ${(currentFilters.search || currentFilters.status !== 'All Statuses' || currentFilters.airline !== 'All Airlines' || currentFilters.travelDate) ? 'inline-flex' : 'none'};">
          Clear Filters
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
        title: 'No tickets found',
        description: 'Try adjusting your search query or filters to find what you are looking for.',
        icon: 'ticket',
        actionText: 'Reset Filters',
        actionId: 'reset-empty-filters-btn'
      });
    }

    return `
      <!-- Desktop Table -->
      <div class="table-responsive desktop-table-view">
        <table class="data-table">
          <thead>
            <tr>
              <th>TICKET / PNR</th>
              <th>PASSENGER</th>
              <th>AIRLINE & ROUTE</th>
              <th>TRAVEL DATE</th>
              <th>PRICE</th>
              <th>BALANCE</th>
              <th>STATUS</th>
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
        <span id="tickets-count-label">Showing <strong>1-${tickets.length}</strong> of <strong>${tickets.length}</strong> entries</span>
        <div class="pagination-controls">
          <button class="pagination-btn" disabled>‹</button>
          <button class="pagination-btn active">1</button>
          <button class="pagination-btn" disabled>›</button>
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
        // Bind reset button if in empty state
        const resetEmpty = cardContainer.querySelector('#reset-empty-filters-btn');
        if (resetEmpty) {
          resetEmpty.addEventListener('click', resetFilters);
        }
      }

      // Update clear button visibility
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
        showToast('Exporting tickets to CSV...', 'info');
        setTimeout(() => showToast('Export completed (tickets-export.csv)', 'success'), 1200);
      });
    }
  }
};

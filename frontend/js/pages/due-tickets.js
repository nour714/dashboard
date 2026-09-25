/**
 * AfricaTravel — Due Tickets Page (تذاكر عليها متبقي)
 *
 * Dedicated section listing tickets with pending or outstanding balances (UNPAID / PARTIALLY PAID).
 * Tickets appear automatically as long as remaining > 0, and clear automatically once fully paid.
 */

import { TicketService } from '../services/ticket-service.js';
import { icons } from '../components/icons.js';
import { renderPageHeader } from '../components/page-header.js';
import { renderStatusBadge } from '../components/status-badge.js';
import { renderEmptyState } from '../components/empty-state.js';
import {
  calculateTotalPaid,
  calculateRemaining,
  formatCurrency,
  formatDate
} from '../utils/calculations.js';
import { escapeHtml } from '../utils/security.js';
import { debounce } from '../utils/dom.js';
import { t } from '../i18n/i18n.js';

let currentFilters = {
  search: '',
  status: 'All'
};

function renderDueTicketRows(tickets) {
  if (tickets.length === 0) return '';

  return tickets.map(tData => {
    const totalPaid = calculateTotalPaid(tData.payments);
    const remaining = calculateRemaining(tData.ticketPrice, totalPaid);

    return `
      <tr class="clickable-row" data-href="/tickets/${escapeHtml(tData.id)}" style="cursor: pointer;">
        <td>
          <a href="/tickets/${escapeHtml(tData.id)}" class="cell-main ltr-data" data-link>
            ${tData.ticketNumber ? escapeHtml(tData.ticketNumber) : `<span class="text-muted">—</span>`}
          </a>
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
          <div class="tabular-nums font-semibold text-muted">${formatCurrency(totalPaid, tData.currency)}</div>
        </td>
        <td>
          <div class="tabular-nums font-bold text-danger" style="font-size: 15px;">
            ${formatCurrency(remaining, tData.currency)}
          </div>
        </td>
        <td>
          ${renderStatusBadge(tData.status)}
        </td>
        <td style="text-align: end;">
          <a href="/tickets/${escapeHtml(tData.id)}" class="btn btn-sm btn-outline-primary d-inline-flex items-center gap-xxs" data-link style="white-space: nowrap;">
            ${icons.ticket('w-3.5 h-3.5')}
            <span>${escapeHtml(t('dueTickets.actionPay') || 'عرض وسداد التذكرة')}</span>
          </a>
        </td>
      </tr>
    `;
  }).join('');
}

function renderDueMobileCards(tickets) {
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
        <div class="text-sm text-muted ltr-data mb-xs">${escapeHtml(tData.phone || tData.email || '--')}</div>
        <div class="mobile-card-route">
          <span class="ltr-data">${escapeHtml(tData.airlineCode || 'MS')}</span>
          <span class="ltr-data">${escapeHtml(tData.origin)} ✈ ${escapeHtml(tData.destination)}</span>
        </div>
        <div class="text-sm text-muted mt-xs">
          PNR: <strong class="ltr-data">${escapeHtml(tData.pnr)}</strong> • ${formatDate(tData.departureDate)}
        </div>
        <div class="mobile-card-meta mt-sm" style="border-top: 1px solid var(--color-border); padding-top: 8px;">
          <div>
            <div class="text-xs text-muted">${escapeHtml(t('dueTickets.remainingAmount') || 'المتبقي المطلوب')}</div>
            <div class="font-bold text-danger tabular-nums" style="font-size: 15px;">
              ${formatCurrency(remaining, tData.currency)}
            </div>
          </div>
          <span class="btn btn-sm btn-primary">${escapeHtml(t('dueTickets.actionPay') || 'عرض وسداد')} ›</span>
        </div>
      </a>
    `;
  }).join('');
}

export const DueTicketsPage = {
  render(_params, query) {
    if (query && query.q) {
      currentFilters.search = query.q;
    }

    const tickets = TicketService.getDueTickets(currentFilters);

    const headerHtml = renderPageHeader({
      title: t('dueTickets.title'),
      subtitle: t('dueTickets.subtitle'),
      actionsHtml: `
        <a href="/tickets" class="btn btn-secondary d-flex items-center gap-xs" data-link>
          ${icons.ticket('w-4 h-4')}
          <span>${escapeHtml(t('nav.tickets'))}</span>
        </a>
        <a href="/tickets/new" class="btn btn-primary d-flex items-center gap-xs" data-link>
          ${icons.plus('w-4 h-4')}
          <span>${escapeHtml(t('tickets.createTicket'))}</span>
        </a>
      `
    });

    return `
      ${headerHtml}

      <!-- Filter Bar -->
      <div class="filter-bar">
        <div class="view-search-box flex-1">
          ${icons.search()}
          <input
            type="search"
            class="form-control"
            id="due-ticket-search-input"
            placeholder="${escapeHtml(t('dueTickets.searchPlaceholder'))}"
            value="${escapeHtml(currentFilters.search)}"
            autocomplete="off"
          />
        </div>

        <div class="filter-item">
          <label class="text-sm text-muted" for="due-ticket-status-filter">${escapeHtml(t('dueTickets.filterStatus'))}</label>
          <select class="form-control" id="due-ticket-status-filter" style="min-width: 170px;">
            <option value="All" ${currentFilters.status === 'All' ? 'selected' : ''}>${escapeHtml(t('dueTickets.filterAll'))}</option>
            <option value="UNPAID" ${currentFilters.status === 'UNPAID' ? 'selected' : ''}>${escapeHtml(t('dueTickets.filterUnpaid'))}</option>
            <option value="PARTIALLY PAID" ${currentFilters.status === 'PARTIALLY PAID' ? 'selected' : ''}>${escapeHtml(t('dueTickets.filterPartiallyPaid'))}</option>
          </select>
        </div>

        <button type="button" class="btn btn-sm btn-ghost text-danger" id="clear-due-filters-btn" style="display: ${(currentFilters.search || currentFilters.status !== 'All') ? 'inline-flex' : 'none'};">
          ${escapeHtml(t('common.reset'))}
        </button>
      </div>

      <!-- Content Container -->
      <div class="card" id="due-tickets-card-container">
        ${this.renderCardContent(tickets)}
      </div>
    `;
  },

  renderCardContent(tickets) {
    if (tickets.length === 0) {
      return renderEmptyState({
        title: t('dueTickets.emptyTitle'),
        description: t('dueTickets.emptySubtitle'),
        icon: 'ticket',
        actionText: (currentFilters.search || currentFilters.status !== 'All') ? t('common.reset') : null,
        actionId: 'reset-empty-due-filters-btn'
      });
    }

    return `
      <!-- Desktop Table -->
      <div class="table-responsive desktop-table-view">
        <table class="data-table">
          <thead>
            <tr>
              <th>${escapeHtml(t('dueTickets.table.ticketNumber'))} / PNR</th>
              <th>${escapeHtml(t('dueTickets.table.passenger'))}</th>
              <th>${escapeHtml(t('dueTickets.table.airlineRoute'))}</th>
              <th>${escapeHtml(t('dueTickets.table.travelDate'))}</th>
              <th>${escapeHtml(t('dueTickets.table.price'))}</th>
              <th>${escapeHtml(t('dueTickets.table.paid'))}</th>
              <th>${escapeHtml(t('dueTickets.table.remaining'))}</th>
              <th>${escapeHtml(t('dueTickets.table.status'))}</th>
              <th style="text-align: end;">${escapeHtml(t('dueTickets.table.action'))}</th>
            </tr>
          </thead>
          <tbody id="due-tickets-table-tbody">
            ${renderDueTicketRows(tickets)}
          </tbody>
        </table>
      </div>

      <!-- Mobile Cards -->
      <div class="mobile-card-list mobile-card-view p-sm" id="due-tickets-mobile-list" style="display: none;">
        ${renderDueMobileCards(tickets)}
      </div>

      <!-- Pagination / Result Count -->
      <div class="pagination-wrap">
        <span id="due-tickets-count-label">
          ${escapeHtml(t('common.showing'))} <strong>1-${tickets.length}</strong> ${escapeHtml(t('common.of'))} <strong>${tickets.length}</strong> ${escapeHtml(t('common.results'))}
        </span>
        <div class="pagination-controls">
          <button class="pagination-btn icon-directional" disabled>‹</button>
          <button class="pagination-btn active">1</button>
          <button class="pagination-btn icon-directional" disabled>›</button>
        </div>
      </div>
    `;
  },

  afterRender(container) {
    const searchInput = container.querySelector('#due-ticket-search-input');
    const statusFilter = container.querySelector('#due-ticket-status-filter');
    const clearBtn = container.querySelector('#clear-due-filters-btn');
    const cardContainer = container.querySelector('#due-tickets-card-container');

    const updateResults = () => {
      const tickets = TicketService.getDueTickets(currentFilters);
      if (cardContainer) {
        cardContainer.innerHTML = DueTicketsPage.renderCardContent(tickets);
        const resetEmpty = cardContainer.querySelector('#reset-empty-due-filters-btn');
        if (resetEmpty) {
          resetEmpty.addEventListener('click', resetFilters);
        }
      }

      const hasFilters = currentFilters.search || currentFilters.status !== 'All';
      if (clearBtn) {
        clearBtn.style.display = hasFilters ? 'inline-flex' : 'none';
      }
    };

    const resetFilters = () => {
      currentFilters = { search: '', status: 'All' };
      if (searchInput) searchInput.value = '';
      if (statusFilter) statusFilter.value = 'All';
      updateResults();
    };

    if (searchInput) {
      const handleSearch = debounce((val) => {
        currentFilters.search = val;
        updateResults();
      }, 250);
      searchInput.addEventListener('input', (e) => handleSearch(e.target.value));
    }

    if (statusFilter) {
      statusFilter.addEventListener('change', (e) => {
        currentFilters.status = e.target.value;
        updateResults();
      });
    }

    if (clearBtn) {
      clearBtn.addEventListener('click', resetFilters);
    }

    // Delegated click on row for SPA navigation
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

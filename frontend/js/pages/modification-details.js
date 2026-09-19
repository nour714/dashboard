/**
 * AfricaTravel — Modification Details Page Component
 *
 * Displays dedicated financial and schedule details for a specific flight modification.
 * Decoupled from the base ticket financial ledger.
 */

import { TicketService } from '../services/ticket-service.js';
import { AuthService } from '../services/auth-service.js';
import { icons } from '../components/icons.js';
import { renderStatusBadge } from '../components/status-badge.js';
import { formatCurrency, formatDateTime } from '../utils/calculations.js';
import { escapeHtml } from '../utils/security.js';
import { t } from '../i18n/i18n.js';

export const ModificationDetailsPage = {
  render(params = {}) {
    const ticketId = params.id;
    const modIndexOrId = params.modIndex;
    const ticket = TicketService.getTicketById(ticketId);

    if (!ticket) {
      return `
        <div class="empty-state" style="margin-top: 60px;">
          <div class="empty-state-title">${escapeHtml(t('validation.ticketNotFound') || 'Ticket not found')}</div>
          <p class="empty-state-desc">The ticket "${escapeHtml(ticketId)}" does not exist.</p>
          <a href="/tickets" class="btn btn-primary" data-link>${escapeHtml(t('ticketCreate.backToTickets') || 'Back to Tickets')}</a>
        </div>
      `;
    }

    const mods = Array.isArray(ticket.modifications) ? ticket.modifications : [];
    const mod = mods.find((m, i) => String(i) === String(modIndexOrId) || String(m.id) === String(modIndexOrId)) || mods[0];

    if (!mod) {
      return `
        <div class="empty-state" style="margin-top: 60px;">
          <div class="empty-state-title">${escapeHtml(t('ticketDetails.modificationsTab.empty') || 'Modification not found')}</div>
          <p class="empty-state-desc">No modification found for this ticket.</p>
          <a href="/tickets/${escapeHtml(ticket.id)}?tab=modifications" class="btn btn-primary" data-link>
            ${escapeHtml(t('common.back') || 'Back to Ticket')}
          </a>
        </div>
      `;
    }

    let nw = mod.newFlight;
    if (typeof nw === 'string') {
      try { nw = JSON.parse(nw); } catch { nw = {}; }
    }
    nw = nw && typeof nw === 'object' ? nw : {};

    const defaultRoute = `${ticket.origin || ''} ✈ ${ticket.destination || ''}`.trim() || '-';
    const nwRoute = nw.route || defaultRoute;
    const nwFlightNum = nw.flightNumber || ticket.flightNumber || '-';
    const nwDate = nw.date || ticket.departureDate || mod.date;
    const nwReturnDate = nw.returnDate;
    const nwReturnFlightNum = nw.returnFlightNumber;
    const nwNote = nw.note;

    const currency = mod.currency || ticket.currency || 'EGP';
    const changeFee = Number(mod.changeFee) || 0;
    const airlineFee = Number(mod.airlineFee) || 0;
    const modProfit = changeFee - airlineFee;

    const currentUser = AuthService.getCurrentUser();
    const isAdmin = (currentUser?.role || '').toUpperCase() === 'ADMIN';

    return `
      <!-- Page Header -->
      <div class="page-header">
        <div class="page-header-left">
          <div class="page-breadcrumbs">
            <a href="/tickets" data-link>${escapeHtml(t('nav.tickets') || 'Tickets')}</a>
            <span class="breadcrumb-separator">›</span>
            <a href="/tickets/${escapeHtml(ticket.id)}" data-link class="ltr-data">${escapeHtml(ticket.id)}</a>
            <span class="breadcrumb-separator">›</span>
            <span>${escapeHtml(t('ticketDetails.tabs.modifications') || 'Modification')}</span>
          </div>
          <h1 class="page-title d-flex items-center gap-sm">
            ${icons.shuffle('w-6 h-6 text-accent')}
            <span>${escapeHtml(mod.title || t('ticketDetails.tabs.modifications') || 'Modification Details')}</span>
            ${renderStatusBadge(mod.status || 'COMPLETED')}
          </h1>
        </div>

        <div class="page-actions">
          <a href="/tickets/${escapeHtml(ticket.id)}?tab=modifications" class="btn btn-secondary" data-link>
            ${icons.arrowLeft('w-4 h-4')}
            <span>${escapeHtml(t('common.back') || 'Back to Ticket')}</span>
          </a>
        </div>
      </div>

      <!-- Quick Summary Row -->
      <div class="card mb-lg">
        <div class="card-body p-md">
          <div class="d-flex items-center justify-between flex-wrap gap-md">
            <div>
              <span class="stat-card-label">${escapeHtml(t('tickets.table.passenger') || 'Passenger')}</span>
              <div class="font-bold text-lg mt-xs">${escapeHtml(ticket.passengerName)}</div>
            </div>
            <div>
              <span class="stat-card-label">PNR</span>
              <div class="font-bold text-lg mt-xs">
                <a href="/tickets/${escapeHtml(ticket.id)}" data-link class="airline-code-badge ltr-data" style="font-size: 15px; text-decoration: none;">
                  ${escapeHtml(ticket.pnr)}
                </a>
              </div>
            </div>
            <div>
              <span class="stat-card-label">${escapeHtml(t('ticketDetails.modificationsTab.table.date') || 'Modification Date')}</span>
              <div class="font-bold text-lg mt-xs">${formatDateTime(mod.date)}</div>
            </div>
            <div>
              <span class="stat-card-label">${escapeHtml(t('ticketDetails.modificationsTab.table.processedBy') || 'Processed By')}</span>
              <div class="font-bold text-lg mt-xs">${escapeHtml(mod.processedBy || 'Agent')}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Financial Ledger Banner (Independent Modification Ledger) -->
      <div class="financial-ledger-banner">
        <div class="financial-ledger-title">${escapeHtml(t('ticketDetails.overview.financialSummary') || 'Modification Financial Details')}</div>
        <div class="financial-grid">
          <div class="financial-item">
            <span class="financial-item-label">${escapeHtml(t('ticketDetails.modificationsTab.table.fee') || 'Customer Fee')}</span>
            <span class="financial-item-value text-danger tabular-nums">${formatCurrency(changeFee, currency)}</span>
          </div>
          <div class="financial-item">
            <span class="financial-item-label">${escapeHtml(t('ticketDetails.modificationsTab.table.airlineFee') || 'Airline Fee')}</span>
            <span class="financial-item-value tabular-nums">${formatCurrency(airlineFee, currency)}</span>
          </div>
          ${isAdmin ? `
            <div class="financial-item">
              <span class="financial-item-label">${escapeHtml(t('ticketDetails.overview.netProfit') || 'Modification Profit')}</span>
              <span class="financial-item-value tabular-nums" style="color: ${modProfit >= 0 ? 'var(--color-success)' : 'var(--color-danger)'};">
                ${formatCurrency(modProfit, currency)}
              </span>
            </div>
          ` : ''}
          <div class="financial-item">
            <span class="financial-item-label">${escapeHtml(t('common.status') || 'Status')}</span>
            <div class="mt-xs">
              ${renderStatusBadge(mod.status || 'COMPLETED')}
            </div>
          </div>
        </div>
      </div>

      <!-- New Flight Schedule & Details Card -->
      <div class="grid grid-cols-12 gap-lg mb-lg">
        <!-- New Flight Details (Left - 8 cols) -->
        <div class="col-span-8">
          <div class="card" style="border: 1px solid var(--color-border-soft); box-shadow: none;">
            <div class="card-header">
              <h3 class="card-title d-flex items-center gap-xs">
                ${icons.airplane('w-5 h-5 text-accent')}
                <span>${escapeHtml(t('ticketDetails.modificationsTab.table.newSchedule') || 'New Flight Schedule')}</span>
              </h3>
              <span class="badge badge-active">${escapeHtml(mod.status || 'COMPLETED')}</span>
            </div>
            <div class="card-body">
              <div class="p-md mb-md" style="background-color: var(--color-surface); border-radius: var(--radius-lg);">
                <div class="d-flex justify-between items-start flex-wrap gap-md">
                  <div>
                    <span class="text-xs text-muted font-medium">${escapeHtml(t('ticketCreate.flightInfo.departureDate') || 'Departure')}</span>
                    <div class="font-bold text-lg mt-xs">${formatDateTime(nwDate)}</div>
                    <div class="text-sm font-semibold ltr-data mt-xs">${escapeHtml(nwRoute)}</div>
                  </div>
                  <div class="text-center d-flex flex-column items-center">
                    <span class="text-xs text-muted ltr-data">${escapeHtml(ticket.flightDuration || '3h 15m')}</span>
                    ${icons.arrowRight('w-5 h-5 text-accent')}
                    <span class="text-xs font-semibold ltr-data mt-xs">${escapeHtml(nwFlightNum)}</span>
                  </div>
                  <div class="text-end">
                    <span class="text-xs text-muted font-medium">${escapeHtml(t('tickets.table.airline') || 'Airline')}</span>
                    <div class="font-bold text-lg mt-xs">${escapeHtml(ticket.airline)}</div>
                    <div class="text-xs text-muted ltr-data mt-xs">${escapeHtml(ticket.cabinClass || 'Economy')}</div>
                  </div>
                </div>

                ${nwReturnDate ? `
                  <div class="mt-md pt-md" style="border-top: 1px dashed var(--color-border-soft);">
                    <div class="d-flex items-center gap-xs text-sm font-semibold mb-xs">
                      <span>↩ ${escapeHtml(t('ticketCreate.returnFlight.title') || 'Return Flight')}</span>
                    </div>
                    <div class="d-flex justify-between items-center text-sm">
                      <div>${formatDateTime(nwReturnDate)}</div>
                      <div class="ltr-data font-medium">${escapeHtml(nwReturnFlightNum || ticket.returnFlightNumber || '-')}</div>
                    </div>
                  </div>
                ` : ''}

                ${nwNote ? `
                  <div class="mt-md p-sm text-xs" style="background: var(--color-surface-hover); border-radius: var(--radius-sm);">
                    <strong class="text-warning">${escapeHtml(t('common.notes') || 'Note')}:</strong> ${escapeHtml(nwNote)}
                  </div>
                ` : ''}
              </div>

              <!-- Reason & Notes -->
              <div class="d-flex flex-column gap-sm text-sm pt-sm" style="border-top: 1px solid var(--color-border-soft);">
                <div class="d-flex justify-between">
                  <span class="text-muted">${escapeHtml(t('common.reason') || 'Reason')}:</span>
                  <strong class="ms-md">${escapeHtml(mod.reason || '-')}</strong>
                </div>
                <div class="d-flex justify-between">
                  <span class="text-muted">${escapeHtml(t('ticketDetails.modificationsTab.table.processedBy') || 'Processed By')}:</span>
                  <span>${escapeHtml(mod.processedBy || 'Agent')}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Linked Ticket Summary (Right - 4 cols) -->
        <div class="col-span-4">
          <div class="card" style="border: 1px solid var(--color-border-soft); box-shadow: none;">
            <div class="card-header">
              <h3 class="card-title">${escapeHtml(t('tickets.table.ticketNumber') || 'Original Ticket')}</h3>
            </div>
            <div class="card-body">
              <div class="d-flex flex-column gap-md text-sm">
                <div class="d-flex justify-between items-center">
                  <span class="text-muted">Ticket ID</span>
                  <a href="/tickets/${escapeHtml(ticket.id)}" data-link class="font-bold ltr-data text-accent">
                    ${escapeHtml(ticket.id)}
                  </a>
                </div>
                <div class="d-flex justify-between items-center">
                  <span class="text-muted">PNR</span>
                  <span class="font-bold ltr-data">${escapeHtml(ticket.pnr)}</span>
                </div>
                <div class="d-flex justify-between items-center">
                  <span class="text-muted">${escapeHtml(t('tickets.table.price') || 'Original Price')}</span>
                  <span class="font-semibold tabular-nums">${formatCurrency(ticket.ticketPrice, ticket.currency)}</span>
                </div>
                <div class="d-flex justify-between items-center">
                  <span class="text-muted">${escapeHtml(t('common.status') || 'Ticket Status')}</span>
                  <span>${renderStatusBadge(ticket.status)}</span>
                </div>

                <div class="pt-md mt-sm" style="border-top: 1px solid var(--color-border-soft);">
                  <a href="/tickets/${escapeHtml(ticket.id)}" data-link class="btn btn-sm btn-primary w-full justify-center">
                    ${icons.ticket('w-4 h-4')}
                    <span>${escapeHtml(t('common.viewDetails') || 'View Original Ticket')}</span>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }
};

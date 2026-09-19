/**
 * AfricaTravel — Refund Details Page Component
 *
 * Displays dedicated financial details for a specific refund request.
 * Decoupled from the base ticket financial ledger.
 */

import { TicketService } from '../services/ticket-service.js';
import { AuthService } from '../services/auth-service.js';
import { icons } from '../components/icons.js';
import { renderStatusBadge } from '../components/status-badge.js';
import { formatCurrency, formatDateTime, calculateTotalPaid } from '../utils/calculations.js';
import { escapeHtml } from '../utils/security.js';
import { t } from '../i18n/i18n.js';

export const RefundDetailsPage = {
  render(params = {}) {
    const ticketId = params.id;
    const refundIndexOrId = params.refundIndex;
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

    const refunds = Array.isArray(ticket.refunds) ? ticket.refunds : [];
    const refund = refunds.find((r, i) => String(i) === String(refundIndexOrId) || String(r.id) === String(refundIndexOrId)) || refunds[0];

    if (!refund) {
      return `
        <div class="empty-state" style="margin-top: 60px;">
          <div class="empty-state-title">${escapeHtml(t('ticketDetails.refundsTab.empty') || 'Refund not found')}</div>
          <p class="empty-state-desc">No refund record found for this ticket.</p>
          <a href="/tickets/${escapeHtml(ticket.id)}?tab=refunds" class="btn btn-primary" data-link>
            ${escapeHtml(t('common.back') || 'Back to Ticket')}
          </a>
        </div>
      `;
    }

    const currency = refund.currency || ticket.currency || 'EGP';
    const amount = Number(refund.amount) || 0;
    const airlineRefundAmount = Number(refund.airlineRefundAmount) || 0;
    const totalPaid = calculateTotalPaid(ticket.payments || []);

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
            <span>${escapeHtml(t('ticketDetails.tabs.refunds') || 'Refund')}</span>
          </div>
          <h1 class="page-title d-flex items-center gap-sm">
            ${icons.refunds('w-6 h-6 text-danger')}
            <span>${escapeHtml(refund.id ? `${t('ticketDetails.tabs.refunds') || 'Refund'} #${refund.id}` : t('ticketDetails.tabs.refunds') || 'Refund Details')}</span>
            ${renderStatusBadge(refund.status || 'PENDING')}
          </h1>
        </div>

        <div class="page-actions">
          <a href="/tickets/${escapeHtml(ticket.id)}?tab=refunds" class="btn btn-secondary" data-link>
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
              <span class="stat-card-label">${escapeHtml(t('ticketDetails.refundsTab.table.date') || 'Refund Date')}</span>
              <div class="font-bold text-lg mt-xs">${formatDateTime(refund.requestedDate || refund.date)}</div>
            </div>
            <div>
              <span class="stat-card-label">${escapeHtml(t('ticketDetails.refundsTab.table.processedBy') || 'Processed By')}</span>
              <div class="font-bold text-lg mt-xs">${escapeHtml(refund.processedBy || 'Agent')}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Financial Ledger Banner (Independent Refund Ledger) -->
      <div class="financial-ledger-banner">
        <div class="financial-ledger-title">${escapeHtml(t('ticketDetails.overview.financialSummary') || 'Refund Financial Details')}</div>
        <div class="financial-grid">
          <div class="financial-item">
            <span class="financial-item-label">${escapeHtml(t('ticketDetails.refundsTab.table.amount') || 'Refund Amount (Customer)')}</span>
            <span class="financial-item-value text-danger tabular-nums">${formatCurrency(amount, currency)}</span>
          </div>
          ${isAdmin ? `
            <div class="financial-item">
              <span class="financial-item-label">${escapeHtml(t('reports.financial.airlineRefund') || 'Airline Refund Amount')}</span>
              <span class="financial-item-value tabular-nums">${formatCurrency(airlineRefundAmount, currency)}</span>
            </div>
          ` : ''}
          <div class="financial-item">
            <span class="financial-item-label">${escapeHtml(t('common.status') || 'Status')}</span>
            <div class="mt-xs">
              ${renderStatusBadge(refund.status || 'PENDING')}
            </div>
          </div>
        </div>
      </div>

      <!-- Refund Details & Original Ticket Grid -->
      <div class="grid grid-cols-12 gap-lg mb-lg">
        <!-- Refund Details (Left - 8 cols) -->
        <div class="col-span-8">
          <div class="card" style="border: 1px solid var(--color-border-soft); box-shadow: none;">
            <div class="card-header">
              <h3 class="card-title d-flex items-center gap-xs">
                ${icons.refunds('w-5 h-5 text-danger')}
                <span>${escapeHtml(t('ticketDetails.refundsTab.title') || 'Refund Information')}</span>
              </h3>
              ${renderStatusBadge(refund.status || 'PENDING')}
            </div>
            <div class="card-body">
              <div class="p-md mb-md" style="background-color: var(--color-surface); border-radius: var(--radius-lg);">
                <div class="d-flex justify-between items-center flex-wrap gap-md">
                  <div>
                    <span class="text-xs text-muted font-medium">${escapeHtml(t('ticketDetails.refundsTab.table.amount') || 'Refund Amount')}</span>
                    <div class="font-bold text-2xl text-danger tabular-nums mt-xs">${formatCurrency(amount, currency)}</div>
                  </div>
                  ${airlineRefundAmount > 0 ? `
                    <div class="text-end">
                      <span class="text-xs text-muted font-medium">✈ ${escapeHtml(t('reports.financial.airlineRefund') || 'Airline Refund')}</span>
                      <div class="font-bold text-lg tabular-nums mt-xs">${formatCurrency(airlineRefundAmount, currency)}</div>
                    </div>
                  ` : ''}
                </div>
              </div>

              <div class="d-flex flex-column gap-md text-sm">
                <div class="d-flex justify-between items-center">
                  <span class="text-muted">${escapeHtml(t('ticketDetails.refundsTab.table.reason') || 'Reason')}:</span>
                  <strong class="font-medium">${escapeHtml(refund.reason || '-')}</strong>
                </div>
                <div class="d-flex justify-between items-center">
                  <span class="text-muted">${escapeHtml(t('ticketDetails.refundsTab.table.date') || 'Requested Date')}:</span>
                  <span>${formatDateTime(refund.requestedDate || refund.date)}</span>
                </div>
                <div class="d-flex justify-between items-center">
                  <span class="text-muted">${escapeHtml(t('ticketDetails.refundsTab.table.processedBy') || 'Processed By')}:</span>
                  <span>${escapeHtml(refund.processedBy || 'Agent')}</span>
                </div>
                ${refund.notes ? `
                  <div class="pt-sm" style="border-top: 1px solid var(--color-border-soft);">
                    <span class="text-muted d-block mb-xs">${escapeHtml(t('common.notes') || 'Notes')}:</span>
                    <div class="p-sm" style="background: var(--color-surface); border-radius: var(--radius-sm);">
                      ${escapeHtml(refund.notes)}
                    </div>
                  </div>
                ` : ''}
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
                  <span class="text-muted">${escapeHtml(t('common.paid') || 'Total Paid')}</span>
                  <span class="font-semibold tabular-nums">${formatCurrency(totalPaid, ticket.currency)}</span>
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

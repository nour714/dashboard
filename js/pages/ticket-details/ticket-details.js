/**
 * AfricaTravel — Ticket Details Orchestrator Component
 */

import { TicketService } from '../../services/ticket-service.js';
import { CustomerService } from '../../services/customer-service.js';
import { icons } from '../../components/icons.js';
import { renderStatusBadge } from '../../components/status-badge.js';
import { renderTabs, bindTabs } from '../../components/tabs.js';
import { formatCurrency, formatDate } from '../../utils/calculations.js';
import { escapeHtml } from '../../utils/security.js';
import { renderOverviewTab } from './overview-tab.js';
import { renderPaymentsTab } from './payments-tab.js';
import { renderModificationsTab } from './modifications-tab.js';
import { renderRefundsTab } from './refunds-tab.js';
import { renderActivityTab } from './activity-tab.js';
import {
  openAddPaymentModal,
  openModifyFlightModal,
  openAddRefundModal,
  openEditTicketModal
} from './ticket-actions.js';

export const TicketDetailsPage = {
  render(params, query = {}) {
    const ticketId = params.id;
    const ticket = TicketService.getTicketById(ticketId);

    if (!ticket) {
      return `
        <div class="empty-state" style="margin-top: 60px;">
          <div class="empty-state-title">Ticket Not Found</div>
          <p class="empty-state-desc">The ticket identifier "${escapeHtml(ticketId)}" does not exist.</p>
          <a href="/tickets" class="btn btn-primary" data-link>Back to Tickets</a>
        </div>
      `;
    }

    const financials = TicketService.getTicketFinancials(ticket);
    const activeTab = query.tab || 'overview';

    const tabs = [
      { id: 'overview', label: 'Overview' },
      { id: 'payments', label: 'Payments', badge: ticket.payments.length },
      { id: 'modifications', label: 'Modifications', badge: ticket.modifications.length },
      { id: 'refunds', label: 'Refunds', badge: ticket.refunds.length },
      { id: 'activity', label: 'Activity' }
    ];

    return `
      <!-- Top Action Header -->
      <div class="page-header">
        <div class="page-header-left">
          <div class="page-breadcrumbs">
            <a href="/tickets" data-link>Tickets</a>
            <span>›</span>
            <span>${escapeHtml(ticket.id)}</span>
          </div>
          <h1 class="page-title">
            <span>${escapeHtml(ticket.id)}</span>
            ${renderStatusBadge(financials.paymentStatus)}
          </h1>
        </div>

        <div class="page-actions">
          <button type="button" class="btn btn-secondary" id="edit-ticket-btn">
            ${icons.edit('w-4 h-4')}
            <span>Edit</span>
          </button>
          <button type="button" class="btn btn-secondary" id="action-add-payment-btn">
            ${icons.payments('w-4 h-4')}
            <span>Add Payment</span>
          </button>
          <button type="button" class="btn btn-secondary" id="action-modify-flight-btn">
            ${icons.shuffle('w-4 h-4')}
            <span>Modify Flight</span>
          </button>
          <button type="button" class="btn btn-danger-outline" id="action-add-refund-btn">
            ${icons.refunds('w-4 h-4')}
            <span>Add Refund</span>
          </button>
        </div>
      </div>

      <!-- Quick Summary Row -->
      <div class="card mb-lg">
        <div class="card-body p-md">
          <div class="d-flex items-center justify-between flex-wrap gap-md">
            <div>
              <span class="stat-card-label">PASSENGER</span>
              <div class="font-bold text-lg mt-xs">${escapeHtml(ticket.passengerName)}</div>
            </div>
            <div>
              <span class="stat-card-label">PNR</span>
              <div class="font-bold text-lg mt-xs">
                <span class="airline-code-badge" style="font-size: 15px;">${escapeHtml(ticket.pnr)}</span>
              </div>
            </div>
            <div>
              <span class="stat-card-label">AIRLINE</span>
              <div class="font-bold text-lg mt-xs d-flex items-center gap-xs">
                ${icons.airplane('w-4 h-4 text-accent')}
                <span>${escapeHtml(ticket.airline)}</span>
              </div>
            </div>
            <div>
              <span class="stat-card-label">ROUTE</span>
              <div class="font-bold text-lg mt-xs">${escapeHtml(ticket.origin)} ? ${escapeHtml(ticket.destination)}</div>
            </div>
            <div>
              <span class="stat-card-label">TRAVEL DATES</span>
              <div class="font-bold text-lg mt-xs">${formatDate(ticket.departureDate)}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Financial Ledger Banner -->
      <div class="financial-ledger-banner">
        <div class="financial-ledger-title">Financial Ledger</div>
        <div class="financial-grid">
          <div class="financial-item">
            <span class="financial-item-label">TOTAL PRICE</span>
            <span class="financial-item-value tabular-nums">${formatCurrency(financials.ticketPrice, financials.currency)}</span>
          </div>
          <div class="financial-item">
            <span class="financial-item-label">PAID</span>
            <span class="financial-item-value paid tabular-nums">${formatCurrency(financials.totalPaid, financials.currency)}</span>
          </div>
          <div class="financial-item">
            <span class="financial-item-label">REMAINING</span>
            <span class="financial-item-value remaining tabular-nums">${formatCurrency(financials.remaining, financials.currency)}</span>
          </div>
          <div class="financial-item">
            <span class="financial-item-label">REFUNDED</span>
            <span class="financial-item-value tabular-nums" style="color: #cbd5e1;">${formatCurrency(financials.totalRefunded, financials.currency)}</span>
          </div>
          <div class="financial-item">
            <span class="financial-item-label">NET VALUE</span>
            <span class="financial-item-value net tabular-nums">${formatCurrency(financials.netValue, financials.currency)}</span>
          </div>
        </div>
      </div>

      <!-- Tab Navigation Container -->
      <div class="card mb-lg" id="ticket-tab-container">
        ${renderTabs(tabs, activeTab)}
        ${renderOverviewTab(ticket)}
        ${renderPaymentsTab(ticket)}
        ${renderModificationsTab(ticket)}
        ${renderRefundsTab(ticket)}
        ${renderActivityTab(ticket)}
      </div>
    `;
  },

  afterRender(container, params, query = {}) {
    const ticketId = params.id;
    const ticket = TicketService.getTicketById(ticketId);
    if (!ticket) return;

    const initialTab = query.tab || 'overview';
    const tabNav = container.querySelector('#ticket-tab-container');

    if (tabNav) {
      bindTabs(tabNav, (tabId) => {
        // Update URL query string without reloading page
        const newUrl = `/tickets/${ticketId}${tabId === 'overview' ? '' : `?tab=${tabId}`}`;
        window.history.replaceState(null, null, newUrl);
      });

      // Activate initial tab if not overview
      if (initialTab !== 'overview') {
        const btn = tabNav.querySelector(`.tab-btn[data-tab="${initialTab}"]`);
        if (btn) btn.click();
      }
    }

    const reRenderView = () => {
      container.innerHTML = TicketDetailsPage.render(params, query);
      TicketDetailsPage.afterRender(container, params, query);
    };

    // Attach Action Modal Triggers
    const triggerAddPayment = () => openAddPaymentModal(ticket, reRenderView);
    const triggerModifyFlight = () => openModifyFlightModal(ticket, reRenderView);
    const triggerAddRefund = () => openAddRefundModal(ticket, reRenderView);
    const triggerEditTicket = () => openEditTicketModal(ticket, reRenderView);

    const btnAddPay = container.querySelector('#action-add-payment-btn');
    const btnTabAddPay = container.querySelector('#tab-add-payment-btn');
    if (btnAddPay) btnAddPay.addEventListener('click', triggerAddPayment);
    if (btnTabAddPay) btnTabAddPay.addEventListener('click', triggerAddPayment);

    const btnMod = container.querySelector('#action-modify-flight-btn');
    const btnTabMod = container.querySelector('#tab-add-mod-trigger-btn');
    const btnTabAddModEmpty = container.querySelector('#tab-add-mod-btn');
    if (btnMod) btnMod.addEventListener('click', triggerModifyFlight);
    if (btnTabMod) btnTabMod.addEventListener('click', triggerModifyFlight);
    if (btnTabAddModEmpty) btnTabAddModEmpty.addEventListener('click', triggerModifyFlight);

    const btnRefund = container.querySelector('#action-add-refund-btn');
    const btnTabRefund = container.querySelector('#tab-add-refund-trigger-btn');
    if (btnRefund) btnRefund.addEventListener('click', triggerAddRefund);
    if (btnTabRefund) btnTabRefund.addEventListener('click', triggerAddRefund);

    const btnEdit = container.querySelector('#edit-ticket-btn');
    if (btnEdit) btnEdit.addEventListener('click', triggerEditTicket);
  }
};

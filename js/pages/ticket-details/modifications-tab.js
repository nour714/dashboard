/**
 * AfricaTravel — Ticket Details: Modifications Tab Component
 */

import { icons } from '../../components/icons.js';
import { renderStatusBadge } from '../../components/status-badge.js';
import { formatCurrency, formatDateTime } from '../../utils/calculations.js';
import { escapeHtml } from '../../utils/security.js';

export function renderModificationsTab(ticket) {
  const modsHtml = ticket.modifications.length === 0 ? `
    <div class="p-lg text-center text-muted">
      <p>No schedule modifications recorded for this ticket.</p>
      <button type="button" class="btn btn-sm btn-secondary mt-sm" id="tab-add-mod-btn">Modify Flight</button>
    </div>
  ` : ticket.modifications.map(m => `
    <div class="card mb-md">
      <div class="card-header">
        <div class="d-flex items-center gap-xs">
          ${icons.shuffle('w-4 h-4 text-accent')}
          <strong class="card-title" style="font-size: 15px;">${escapeHtml(m.title)}</strong>
          <span class="text-sm text-muted">Requested ${formatDateTime(m.date)}</span>
        </div>
        ${renderStatusBadge(m.status)}
      </div>
      <div class="card-body">
        <div class="d-flex items-center justify-between gap-md mb-md p-md" style="background-color: var(--color-surface); border-radius: var(--radius-lg); flex-wrap: wrap;">
          <div>
            <span class="stat-card-label">ORIGINAL</span>
            <div class="font-bold mt-xs" style="font-size: 18px;">${escapeHtml(m.originalFlight.route || `${ticket.origin} ? ${ticket.destination}`)}</div>
            <div class="text-sm text-muted">${formatDateTime(m.originalFlight.date)} • ${escapeHtml(m.originalFlight.flightNumber || ticket.flightNumber)}</div>
          </div>
          <div class="d-flex flex-column items-center">
            ${icons.arrowRight('w-6 h-6 text-accent')}
            <span class="text-xs text-accent font-semibold">CHANGED</span>
          </div>
          <div>
            <span class="stat-card-label">NEW SCHEDULE</span>
            <div class="font-bold mt-xs" style="font-size: 18px;">${escapeHtml(m.newFlight.route || `${ticket.origin} ? ${ticket.destination}`)}</div>
            <div class="text-sm text-muted">${formatDateTime(m.newFlight.date)} • ${escapeHtml(m.newFlight.flightNumber || ticket.flightNumber)}</div>
            <div class="text-xs font-semibold text-warning">${escapeHtml(m.newFlight.note || '')}</div>
          </div>
        </div>
        <div class="d-flex justify-between items-center text-sm pt-sm" style="border-top: 1px solid var(--color-border-soft);">
          <div>
            <span class="text-muted">Change Fee:</span>
            <strong class="tabular-nums text-danger font-bold ml-xs">${formatCurrency(m.changeFee, m.currency || ticket.currency)}</strong>
            <span class="text-muted ml-md">Reason:</span> ${escapeHtml(m.reason)}
          </div>
          <div class="text-muted">
            Req. by <strong>${escapeHtml(m.requestedBy || ticket.passengerName)}</strong> • Proc. by <strong>${escapeHtml(m.processedBy || 'Agent')}</strong>
          </div>
        </div>
      </div>
    </div>
  `).join('');

  return `
    <div class="tab-pane" id="tab-pane-modifications">
      <div class="card-header">
        <h3 class="card-title">Schedule Revision History</h3>
        <button type="button" class="btn btn-sm btn-secondary" id="tab-add-mod-trigger-btn">
          ${icons.shuffle('w-4 h-4')}
          <span>Modify Flight</span>
        </button>
      </div>
      <div class="card-body">
        ${modsHtml}
      </div>
    </div>
  `;
}

/**
 * AfricaTravel - Ticket Details: Modifications Tab Component
 */

import { icons } from '../../components/icons.js';
import { renderStatusBadge } from '../../components/status-badge.js';
import { formatCurrency, formatDateTime } from '../../utils/calculations.js';
import { escapeHtml } from '../../utils/security.js';
import { t } from '../../i18n/i18n.js';

export function renderModificationsTab(ticket) {
  const mods = Array.isArray(ticket?.modifications) ? ticket.modifications : [];
  const modsHtml = mods.length === 0 ? `
    <div class="p-lg text-center text-muted">
      <p>${escapeHtml(t('ticketDetails.modificationsTab.empty'))}</p>
      <button type="button" class="btn btn-sm btn-secondary mt-sm" id="tab-add-mod-btn">${escapeHtml(t('ticketDetails.modificationsTab.modifyBtn'))}</button>
    </div>
  ` : mods.map(m => {
    let orig = m.originalFlight;
    if (typeof orig === 'string') {
      try { orig = JSON.parse(orig); } catch { orig = {}; }
    }
    orig = orig && typeof orig === 'object' ? orig : {};

    let nw = m.newFlight;
    if (typeof nw === 'string') {
      try { nw = JSON.parse(nw); } catch { nw = {}; }
    }
    nw = nw && typeof nw === 'object' ? nw : {};

    const defaultRoute = `${ticket?.origin || ''} ✈ ${ticket?.destination || ''}`.trim() || '-';
    const origRoute = orig.route || defaultRoute;
    const origFlightNum = orig.flightNumber || ticket?.flightNumber || '-';
    const origDate = orig.date || ticket?.departureDate || m.date;

    const nwRoute = nw.route || defaultRoute;
    const nwFlightNum = nw.flightNumber || ticket?.flightNumber || '-';
    const nwDate = nw.date || ticket?.departureDate || m.date;

    return `
    <div class="card mb-md">
      <div class="card-header">
        <div class="d-flex items-center gap-xs">
          ${icons.shuffle('w-4 h-4 text-accent')}
          <strong class="card-title" style="font-size: 15px;">${escapeHtml(m.title || t('ticketDetails.tabs.modifications') || 'Modification')}</strong>
          <span class="text-sm text-muted">${formatDateTime(m.date)}</span>
        </div>
        ${renderStatusBadge(m.status || 'COMPLETED')}
      </div>
      <div class="card-body">
        <div class="d-flex items-center justify-between gap-md mb-md p-md" style="background-color: var(--color-surface); border-radius: var(--radius-lg); flex-wrap: wrap;">
          <div>
            <span class="stat-card-label">${escapeHtml(t('ticketDetails.modificationsTab.table.previousSchedule'))}</span>
            <div class="font-bold mt-xs ltr-data" style="font-size: 18px;">${escapeHtml(origRoute)}</div>
            <div class="text-sm text-muted">${formatDateTime(origDate)} • <span class="ltr-data">${escapeHtml(origFlightNum)}</span></div>
          </div>
          <div class="d-flex flex-column items-center">
            ${icons.arrowRight('w-6 h-6 text-accent')}
            <span class="text-xs text-accent font-semibold">${escapeHtml(t('status.MODIFIED'))}</span>
          </div>
          <div>
            <span class="stat-card-label">${escapeHtml(t('ticketDetails.modificationsTab.table.newSchedule'))}</span>
            <div class="font-bold mt-xs ltr-data" style="font-size: 18px;">${escapeHtml(nwRoute)}</div>
            <div class="text-sm text-muted">${formatDateTime(nwDate)} • <span class="ltr-data">${escapeHtml(nwFlightNum)}</span></div>
            ${nw.returnDate ? `
              <div class="text-xs text-muted mt-xxs">↩ ${formatDateTime(nw.returnDate)} • <span class="ltr-data">${escapeHtml(nw.returnFlightNumber || ticket?.returnFlightNumber || '')}</span></div>
            ` : ''}
            <div class="text-xs font-semibold text-warning">${escapeHtml(nw.note || '')}</div>
          </div>
        </div>
        <div class="d-flex justify-between items-center text-sm pt-sm" style="border-top: 1px solid var(--color-border-soft); flex-wrap: wrap; gap: 8px;">
          <div>
            <span class="text-muted">${escapeHtml(t('ticketDetails.modificationsTab.table.fee'))}:</span>
            <strong class="tabular-nums text-danger font-bold ms-xs">${formatCurrency(m.changeFee, m.currency || ticket?.currency)}</strong>
            ${m.airlineFee !== undefined ? `
              <span class="text-muted ms-md">${escapeHtml(t('ticketDetails.modificationsTab.table.airlineFee'))}:</span>
              <strong class="tabular-nums ms-xs">${formatCurrency(m.airlineFee, m.currency || ticket?.currency)}</strong>
            ` : ''}
            <span class="text-muted ms-md">${escapeHtml(t('common.reason'))}:</span> ${escapeHtml(m.reason || '-')}
          </div>
          <div class="text-muted">
            ${escapeHtml(t('ticketDetails.modificationsTab.table.processedBy'))}: <strong>${escapeHtml(m.processedBy || 'Agent')}</strong>
          </div>
        </div>
      </div>
    </div>
  `;
  }).join('');

  return `
    <div class="tab-pane" id="tab-pane-modifications">
      <div class="card-header">
        <h3 class="card-title">${escapeHtml(t('ticketDetails.modificationsTab.title'))}</h3>
        <button type="button" class="btn btn-sm btn-secondary" id="tab-add-mod-trigger-btn">
          ${icons.shuffle('w-4 h-4')}
          <span>${escapeHtml(t('ticketDetails.modificationsTab.modifyBtn'))}</span>
        </button>
      </div>
      <div class="card-body">
        ${modsHtml}
      </div>
    </div>
  `;
}

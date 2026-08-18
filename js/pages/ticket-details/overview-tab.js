/**
 * AfricaTravel - Ticket Details: Overview Tab Component
 */

import { icons } from '../../components/icons.js';
import { renderStatusBadge } from '../../components/status-badge.js';
import { formatDate, formatDateTime } from '../../utils/calculations.js';
import { escapeHtml } from '../../utils/security.js';
import { t } from '../../i18n/i18n.js';

export function renderOverviewTab(ticket) {
  const paxInitials = ticket.passengerName.split(' ').map(n => n[0]).filter(Boolean).join('').substring(0, 2).toUpperCase() || 'PA';

  return `
    <div class="tab-pane active" id="tab-pane-overview">
      <div class="card-body">
        <div class="grid grid-cols-12 gap-lg">
          <!-- Left: Itinerary Details -->
          <div class="col-span-8">
            <div class="card" style="border: 1px solid var(--color-border-soft); box-shadow: none;">
              <div class="card-header">
                <h3 class="card-title">${escapeHtml(t('ticketCreate.flightInfo.title'))}</h3>
                <span class="badge badge-neutral">${escapeHtml(ticket.tripType || 'One Way')}</span>
              </div>
              <div class="card-body">
                <!-- Outbound Leg -->
                <div class="mb-lg">
                  <div class="d-flex items-center gap-xs mb-sm">
                    <span class="badge badge-active">${escapeHtml(t('ticketCreate.flightInfo.departureDate'))}</span>
                    <span class="font-semibold text-sm">${formatDate(ticket.departureDate)}</span>
                  </div>
                  <div class="d-flex justify-between items-start p-md" style="background-color: var(--color-surface); border-radius: var(--radius-lg);">
                    <div>
                      <div class="font-bold text-lg tabular-nums">${ticket.departureDate ? new Date(ticket.departureDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }) : '--:--'}</div>
                      <div class="text-sm font-semibold ltr-data">${escapeHtml(ticket.origin)} (${escapeHtml(ticket.originTerminal || 'Main Terminal')})</div>
                      <div class="text-xs text-muted">${escapeHtml(ticket.originAirportName || 'Origin Airport')}</div>
                    </div>
                    <div class="text-center d-flex flex-column items-center">
                      <span class="text-xs text-muted ltr-data">${escapeHtml(ticket.flightDuration || '3h 15m')}</span>
                      ${icons.arrowRight('w-5 h-5 text-muted')}
                      <span class="text-xs font-semibold ltr-data">${escapeHtml(ticket.flightNumber || 'MS 901')} • ${escapeHtml(ticket.cabinClass || 'Economy')}</span>
                    </div>
                    <div class="text-end">
                      <div class="font-bold text-lg tabular-nums">${ticket.arrivalDate ? new Date(ticket.arrivalDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }) : '--:--'}</div>
                      <div class="text-sm font-semibold ltr-data">${escapeHtml(ticket.destination)} (${escapeHtml(ticket.destinationTerminal || 'Main Terminal')})</div>
                      <div class="text-xs text-muted">${escapeHtml(ticket.destinationAirportName || 'Destination Airport')}</div>
                    </div>
                  </div>
                </div>

                ${ticket.returnDepartureDate ? `
                  <!-- Return Leg -->
                  <div>
                    <div class="d-flex items-center gap-xs mb-sm">
                      <span class="badge badge-neutral">${escapeHtml(t('ticketCreate.flightInfo.returnDate'))}</span>
                      <span class="font-semibold text-sm">${formatDate(ticket.returnDepartureDate)}</span>
                    </div>
                    <div class="d-flex justify-between items-start p-md" style="background-color: var(--color-surface); border-radius: var(--radius-lg);">
                      <div>
                        <div class="font-bold text-lg tabular-nums">${new Date(ticket.returnDepartureDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}</div>
                        <div class="text-sm font-semibold ltr-data">${escapeHtml(ticket.destination)} (${escapeHtml(ticket.destinationTerminal || 'Main Terminal')})</div>
                      </div>
                      <div class="text-center d-flex flex-column items-center">
                        <span class="text-xs text-muted ltr-data">${escapeHtml(ticket.flightDuration || '3h 15m')}</span>
                        ${icons.arrowRight('w-5 h-5 text-muted')}
                        <span class="text-xs font-semibold ltr-data">${escapeHtml(ticket.returnFlightNumber || 'MS 902')} • ${escapeHtml(ticket.cabinClass || 'Economy')}</span>
                      </div>
                      <div class="text-end">
                        <div class="font-bold text-lg tabular-nums">${ticket.returnArrivalDate ? new Date(ticket.returnArrivalDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }) : '--:--'}</div>
                        <div class="text-sm font-semibold ltr-data">${escapeHtml(ticket.origin)} (${escapeHtml(ticket.originTerminal || 'Main Terminal')})</div>
                      </div>
                    </div>
                  </div>
                ` : ''}

                <div class="d-flex gap-lg mt-md pt-md text-sm text-secondary" style="border-top: 1px solid var(--color-border-soft);">
                  <div><strong>Seat:</strong> <span class="ltr-data">${escapeHtml(ticket.seat || '12A')}</span></div>
                  <div><strong>Baggage:</strong> ${escapeHtml(ticket.baggage || '2 x 23kg')}</div>
                  <div><strong>Cabin:</strong> ${escapeHtml(ticket.cabinClass || 'Economy')}</div>
                </div>
              </div>
            </div>
          </div>

          <!-- Right: Passenger & Record Information -->
          <div class="col-span-4 d-flex flex-column gap-md">
            <!-- Passenger Information -->
            <div class="card" style="border: 1px solid var(--color-border-soft); box-shadow: none;">
              <div class="card-header">
                <h3 class="card-title">${escapeHtml(t('ticketCreate.passengerInfo.title'))}</h3>
              </div>
              <div class="card-body">
                <div class="d-flex items-center gap-sm mb-md">
                  <div class="sidebar-user-avatar" style="width: 42px; height: 42px; font-size: 16px; background-color: var(--color-accent);">
                    ${paxInitials}
                  </div>
                  <div>
                    <div class="font-bold" style="font-size: 16px;">${escapeHtml(ticket.passengerName)}</div>
                    <div class="text-xs text-muted">Adult (ADT)</div>
                  </div>
                </div>

                <div class="d-flex flex-column gap-sm text-sm">
                  <div class="d-flex justify-between">
                    <span class="text-muted">${escapeHtml(t('ticketCreate.passengerInfo.passport'))}</span>
                    <strong class="ltr-data">${escapeHtml(ticket.passport || '-')}</strong>
                  </div>
                  <div class="d-flex justify-between">
                    <span class="text-muted">${escapeHtml(t('customerDetails.nationality'))}</span>
                    <span>${escapeHtml(ticket.nationality || 'Egyptian (EGY)')}</span>
                  </div>
                  <div class="d-flex justify-between">
                    <span class="text-muted">${escapeHtml(t('ticketCreate.passengerInfo.phone'))}</span>
                    <span class="ltr-data">${escapeHtml(ticket.phone || '-')}</span>
                  </div>
                  <div class="d-flex justify-between">
                    <span class="text-muted">${escapeHtml(t('ticketCreate.passengerInfo.email'))}</span>
                    <span class="ltr-data">${escapeHtml(ticket.email || '-')}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

/**
 * AfricaTravel - Ticket Details: Activity Timeline Tab Component
 */

import { store } from '../../state/store.js';
import { formatDateTime, formatRelativeTime } from '../../utils/calculations.js';
import { escapeHtml } from '../../utils/security.js';
import { t } from '../../i18n/i18n.js';

export function renderActivityTab(ticket) {
  const { activityLogs = [] } = store.getState();
  const ticketLogs = activityLogs.filter(log => log.ticketId === ticket.id);

  const logsHtml = ticketLogs.length === 0 ? `
    <div class="p-lg text-center text-muted">
      <p>${escapeHtml(t('common.noData'))}</p>
    </div>
  ` : `
    <div class="timeline">
      ${ticketLogs.map(log => {
        const initials = log.user.split(' ').map(n => n[0]).filter(Boolean).join('').substring(0, 2).toUpperCase() || 'US';
        return `
          <div class="timeline-item">
            <div class="sidebar-user-avatar" style="width: 32px; height: 32px; font-size: 12px; background-color: var(--color-primary);">
              ${initials}
            </div>
            <div class="timeline-content">
              <div class="timeline-header">
                <strong>${escapeHtml(log.user)}</strong>
                <span class="timeline-time">${formatRelativeTime(log.timestamp)} (${formatDateTime(log.timestamp)})</span>
              </div>
              <div class="timeline-body">
                ${escapeHtml(log.description)}
              </div>
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;

  return `
    <div class="tab-pane" id="tab-pane-activity">
      <div class="card-header">
        <h3 class="card-title">${escapeHtml(t('ticketDetails.activityTab.title'))}</h3>
      </div>
      <div class="card-body">
        ${logsHtml}
      </div>
    </div>
  `;
}

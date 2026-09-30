/**
 * AfricaTravel — App Modals Component
 *
 * Encapsulates system-wide modal dialogs (Notifications, Help & Workflows)
 * to maintain clean modularity and separation of concerns from the main App orchestrator.
 */

import { store } from '../state/store.js';
import { openModal, closeModal } from './modal.js';
import { escapeHtml } from '../utils/security.js';
import { getUpcomingFlightReminders } from '../utils/flight-reminders.js';
import { t } from '../i18n/i18n.js';

/**
 * Opens the Notifications modal dialog displaying upcoming flight reminders and recent audit activities.
 */
export function openNotificationsModal() {
  const { activityLogs, tickets } = store.getState();
  const flightReminders = getUpcomingFlightReminders(tickets || []);
  const recent = (activityLogs || []).slice(0, 4);

  openModal({
    title: t('modals.notifications.title'),
    subtitle: t('modals.notifications.subtitle'),
    maxWidth: '480px',
    contentHtml: `
      <div class="d-flex flex-column gap-sm">
        ${flightReminders.length > 0 ? `
          <div class="d-flex flex-column gap-sm mb-xs">
            ${flightReminders.map(r => `
              <a href="/tickets/${r.ticketId}" data-link class="p-sm notif-reminder-item" style="display:block; background-color: var(--color-warning-soft, #fff8e6); border-radius: var(--radius-md); border: 1px solid var(--color-warning, #f0b429); text-decoration: none; color: inherit;">
                <div class="d-flex justify-between text-xs text-muted mb-xxs">
                  <strong style="color: #b45309;">${r.type === 'DEPARTURE' ? escapeHtml(t('notifications.departureSoon')) : escapeHtml(t('notifications.returnSoon'))}</strong>
                  <span>${r.date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                </div>
                <div class="text-sm font-medium">${escapeHtml(r.passengerName)} — ${escapeHtml(r.route)}</div>
                <div class="text-xs text-muted">${r.ticketNumber ? escapeHtml(r.ticketNumber) : escapeHtml(r.ticketId)}</div>
              </a>
            `).join('')}
          </div>
        ` : ''}
        ${recent.map(r => `
          <div class="p-sm" style="background-color: var(--color-surface); border-radius: var(--radius-md); border: 1px solid var(--color-border-soft);">
            <div class="d-flex justify-between text-xs text-muted mb-xxs">
              <strong>${escapeHtml(r.user)}</strong>
              <span>${new Date(r.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
            <div class="text-sm font-medium">${escapeHtml(r.description)}</div>
          </div>
        `).join('')}
        ${flightReminders.length === 0 && recent.length === 0 ? `
          <div class="p-md text-center text-sm text-muted">
            ${escapeHtml(t('common.noRecords')) || 'No notifications'}
          </div>
        ` : ''}
      </div>
    `,
    footerHtml: `
      <a href="/activity" class="btn btn-sm btn-primary" id="view-all-audit-btn" data-link>${escapeHtml(t('modals.notifications.viewAll'))}</a>
    `,
    onOpen: (modalEl) => {
      const link = modalEl.querySelector('#view-all-audit-btn');
      if (link) {
        link.addEventListener('click', () => closeModal());
      }
      const reminderLinks = modalEl.querySelectorAll('.notif-reminder-item');
      reminderLinks.forEach(rl => {
        rl.addEventListener('click', () => closeModal());
      });
    }
  });
}

/**
 * Opens the Help & Technical Support modal dialog describing key platform workflows.
 */
export function openHelpModal() {
  openModal({
    title: t('modals.help.title'),
    subtitle: t('modals.help.subtitle'),
    contentHtml: `
      <div class="d-flex flex-column gap-md text-sm">
        <div>
          <h4 style="margin-bottom: 6px;">${escapeHtml(t('modals.help.workflows'))}</h4>
          <ul style="padding-inline-start: 20px; color: var(--color-text-secondary); line-height: 1.6;">
            <li><strong>${escapeHtml(t('tickets.createTicket'))}:</strong> ${escapeHtml(t('modals.help.issueTicketDesc'))}</li>
            <li><strong>${escapeHtml(t('ticketDetails.actions.addPayment'))}:</strong> ${escapeHtml(t('modals.help.recordPaymentDesc'))}</li>
            <li><strong>${escapeHtml(t('ticketDetails.actions.modifyFlight'))}:</strong> ${escapeHtml(t('modals.help.modifyFlightDesc'))}</li>
            <li><strong>${escapeHtml(t('ticketDetails.actions.requestRefund'))}:</strong> ${escapeHtml(t('modals.help.refundDesc'))}</li>
          </ul>
        </div>
        <div class="p-sm" style="background-color: var(--color-surface); border-radius: var(--radius-md);">
          <strong>${escapeHtml(t('modals.help.techSupport'))}</strong>
          <p class="text-xs text-muted" style="margin-top: 4px;">${escapeHtml(t('brand.terminal'))} v1.0.0 (Bilingual LTR/RTL)</p>
        </div>
      </div>
    `,
    footerHtml: `
      <button type="button" class="btn btn-secondary" data-modal-close>${escapeHtml(t('common.close'))}</button>
    `
  });
}

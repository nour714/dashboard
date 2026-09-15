/**
 * AfricaTravel - Empty State Component
 */

import { icons } from './icons.js';
import { escapeHtml } from '../utils/security.js';

export function renderEmptyState(options = {}) {
  const {
    title = 'No records found',
    description = 'There are no items matching your criteria at this time.',
    icon = 'ticket',
    actionText = '',
    actionHref = '',
    actionId = ''
  } = options;

  const iconSvg = typeof icons[icon] === 'function' ? icons[icon]('w-8 h-8') : (typeof icons.ticket === 'function' ? icons.ticket('w-8 h-8') : '');

  let actionHtml = '';
  if (actionText) {
    const safeText = escapeHtml(actionText);
    if (actionHref) {
      actionHtml = `<a href="${escapeHtml(actionHref)}" class="btn btn-primary" data-link>${safeText}</a>`;
    } else if (actionId) {
      actionHtml = `<button type="button" class="btn btn-primary" id="${escapeHtml(actionId)}">${safeText}</button>`;
    }
  }

  return `
    <div class="empty-state" role="status">
      <div class="empty-state-icon" aria-hidden="true">
        ${iconSvg}
      </div>
      <div class="empty-state-title">${escapeHtml(title)}</div>
      <p class="empty-state-desc">${escapeHtml(description)}</p>
      ${actionHtml}
    </div>
  `;
}

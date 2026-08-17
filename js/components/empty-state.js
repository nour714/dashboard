/**
 * AfriciaTravel — Empty State Component
 */

import { icons } from './icons.js';

export function renderEmptyState(options) {
  const {
    title = 'No records found',
    description = 'There are no items matching your criteria at this time.',
    icon = 'ticket',
    actionText = '',
    actionHref = '',
    actionId = ''
  } = options;

  const iconSvg = typeof icons[icon] === 'function' ? icons[icon]('w-8 h-8') : icons.ticket('w-8 h-8');

  let actionHtml = '';
  if (actionText) {
    if (actionHref) {
      actionHtml = `<a href="${actionHref}" class="btn btn-primary" data-link>${actionText}</a>`;
    } else if (actionId) {
      actionHtml = `<button type="button" class="btn btn-primary" id="${actionId}">${actionText}</button>`;
    }
  }

  return `
    <div class="empty-state">
      <div class="empty-state-icon">
        ${iconSvg}
      </div>
      <div class="empty-state-title">${title}</div>
      <p class="empty-state-desc">${description}</p>
      ${actionHtml}
    </div>
  `;
}

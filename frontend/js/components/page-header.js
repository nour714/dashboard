import { escapeHtml } from '../utils/security.js';

export function renderPageHeader(options) {
  const {
    title,
    subtitle = '',
    badge = '',
    breadcrumbs = [], // Array of { label, href }
    actionsHtml = ''
  } = options;

  let breadcrumbsHtml = '';
  if (breadcrumbs.length > 0) {
    const items = breadcrumbs.map((b, idx) => {
      const isLast = idx === breadcrumbs.length - 1;
      const safeLabel = escapeHtml(b.label || '');
      if (isLast || !b.href) {
        return `<span aria-current="${isLast ? 'page' : 'false'}">${safeLabel}</span>`;
      }
      return `<a href="${escapeHtml(b.href)}" data-link>${safeLabel}</a> <span class="breadcrumb-separator" aria-hidden="true">›</span>`;
    }).join(' ');

    breadcrumbsHtml = `<nav aria-label="Breadcrumb" class="page-breadcrumbs">${items}</nav>`;
  }

  return `
    <div class="page-header">
      <div class="page-header-left">
        ${breadcrumbsHtml}
        <h1 class="page-title">
          ${escapeHtml(title || '')}
          ${badge ? badge : ''}
        </h1>
        ${subtitle ? `<p class="page-subtitle">${escapeHtml(subtitle)}</p>` : ''}
      </div>
      ${actionsHtml ? `<div class="page-actions">${actionsHtml}</div>` : ''}
    </div>
  `;
}

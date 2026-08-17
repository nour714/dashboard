/**
 * AfriciaTravel — Page Header Component
 */

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
      if (isLast || !b.href) {
        return `<span>${b.label}</span>`;
      }
      return `<a href="${b.href}" data-link>${b.label}</a> <span>›</span>`;
    }).join(' ');

    breadcrumbsHtml = `<div class="page-breadcrumbs">${items}</div>`;
  }

  return `
    <div class="page-header">
      <div class="page-header-left">
        ${breadcrumbsHtml}
        <h1 class="page-title">
          ${title}
          ${badge ? badge : ''}
        </h1>
        ${subtitle ? `<p class="page-subtitle">${subtitle}</p>` : ''}
      </div>
      ${actionsHtml ? `<div class="page-actions">${actionsHtml}</div>` : ''}
    </div>
  `;
}

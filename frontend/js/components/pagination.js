/**
 * AfricaTravel — Reusable Accessible Pagination Component
 *
 * Renders numeric pagination controls with previous/next arrows and smart ellipsis truncation.
 */

import { t } from '../i18n/i18n.js';
import { escapeHtml } from '../utils/security.js';

/**
 * Calculates page numbers array with ellipses.
 * e.g., for totalPages = 10, current = 5: [1, '...', 4, 5, 6, '...', 10]
 * @param {number} currentPage
 * @param {number} totalPages
 * @returns {Array<number|string>}
 */
export function getPaginationRange(currentPage, totalPages) {
  const current = Math.max(1, Math.min(currentPage, totalPages || 1));
  const total = Math.max(1, totalPages || 1);

  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  const pages = [];
  const leftBound = Math.max(2, current - 1);
  const rightBound = Math.min(total - 1, current + 1);

  pages.push(1);

  if (leftBound > 2) {
    pages.push('...');
  }

  for (let p = leftBound; p <= rightBound; p++) {
    pages.push(p);
  }

  if (rightBound < total - 1) {
    pages.push('...');
  }

  pages.push(total);

  return pages;
}

/**
 * Renders the pagination wrapper HTML.
 * @param {object} options
 * @param {number} options.currentPage - 1-based current page index
 * @param {number} options.totalPages - Total number of pages
 * @param {number} options.totalItems - Total items count across all pages
 * @param {number} options.pageSize - Items per page
 * @param {string} [options.countLabelId] - DOM id for the result count label
 * @returns {string} HTML string
 */
export function renderPagination({
  currentPage = 1,
  totalPages = 1,
  totalItems = 0,
  pageSize = 10,
  countLabelId = ''
} = {}) {
  const safeTotalPages = Math.max(1, totalPages || 1);
  const safeCurrent = Math.max(1, Math.min(currentPage || 1, safeTotalPages));
  const startItem = totalItems === 0 ? 0 : (safeCurrent - 1) * pageSize + 1;
  const endItem = Math.min(safeCurrent * pageSize, totalItems);

  const labelIdAttr = countLabelId ? ` id="${escapeHtml(countLabelId)}"` : '';
  const pageRange = getPaginationRange(safeCurrent, safeTotalPages);

  const prevDisabled = safeCurrent <= 1;
  const nextDisabled = safeCurrent >= safeTotalPages;

  const buttonsHtml = pageRange.map((item, idx) => {
    if (item === '...') {
      return `<span class="pagination-ellipsis" aria-hidden="true" key="ellipsis-${idx}">…</span>`;
    }
    const isActive = item === safeCurrent;
    return `
      <button
        type="button"
        class="pagination-btn ${isActive ? 'active' : ''}"
        data-page="${item}"
        ${isActive ? 'aria-current="page"' : ''}
        aria-label="${escapeHtml(t('common.page') || 'Page')} ${item}"
      >${item}</button>
    `;
  }).join('');

  return `
    <div class="pagination-wrap">
      <span class="pagination-count"${labelIdAttr}>
        ${escapeHtml(t('common.showing') || 'Showing')} <strong>${startItem}-${endItem}</strong> ${escapeHtml(t('common.of') || 'of')} <strong>${totalItems}</strong> ${escapeHtml(t('common.results') || 'results')}
      </span>
      <div class="pagination-controls" role="navigation" aria-label="Pagination">
        <button
          type="button"
          class="pagination-btn icon-directional"
          data-page-action="prev"
          ${prevDisabled ? 'disabled' : ''}
          aria-label="${escapeHtml(t('common.prev') || 'Previous Page')}"
        >‹</button>
        ${buttonsHtml}
        <button
          type="button"
          class="pagination-btn icon-directional"
          data-page-action="next"
          ${nextDisabled ? 'disabled' : ''}
          aria-label="${escapeHtml(t('common.next') || 'Next Page')}"
        >›</button>
      </div>
    </div>
  `;
}

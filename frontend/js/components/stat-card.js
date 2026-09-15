/**
 * AfricaTravel - Stat / KPI Card Component
 */

import { icons } from './icons.js';
import { escapeHtml } from '../utils/security.js';

export function renderStatCard(options = {}) {
  const {
    label,
    value,
    icon = 'dashboard',
    iconStyle = 'accent', // 'accent' | 'success' | 'warning' | 'danger'
    trendText = '',
    trendDirection = 'positive', // 'positive' | 'negative' | 'neutral'
    progress = null, // percentage 0-100
    alertPill = '', // E.g. 'REQUIRES ACTION'
    subtext = ''
  } = options;

  const iconSvg = typeof icons[icon] === 'function' ? icons[icon]('w-5 h-5') : '';

  let trendHtml = '';
  if (trendText) {
    const trendIcon = trendDirection === 'positive'
      ? (typeof icons.trendingUp === 'function' ? icons.trendingUp('w-3 h-3') : '')
      : (trendDirection === 'negative' ? (typeof icons.trendingDown === 'function' ? icons.trendingDown('w-3 h-3') : '') : '');
    trendHtml = `
      <span class="trend-indicator ${escapeHtml(trendDirection)}">
        ${trendIcon} ${escapeHtml(trendText)}
      </span>
    `;
  }

  let alertHtml = '';
  if (alertPill) {
    alertHtml = `<span class="badge badge-cancelled">${escapeHtml(alertPill)}</span>`;
  }

  let progressHtml = '';
  if (progress !== null && progress !== undefined) {
    const safeProgress = Math.min(100, Math.max(0, Number(progress) || 0));
    progressHtml = `
      <div class="stat-progress-bar" role="progressbar" aria-valuenow="${safeProgress}" aria-valuemin="0" aria-valuemax="100">
        <div class="stat-progress-fill" style="width: ${safeProgress}%;"></div>
      </div>
    `;
  }

  return `
    <div class="stat-card">
      <div class="stat-card-top">
        <span class="stat-card-label">${escapeHtml(label || '')}</span>
        <div class="stat-card-icon-wrap ${escapeHtml(iconStyle)}">
          ${iconSvg}
        </div>
      </div>
      <div class="stat-card-value ${alertPill ? 'highlight-danger' : ''}">${escapeHtml(String(value ?? ''))}</div>
      ${progressHtml}
      <div class="stat-card-bottom">
        ${trendHtml || (subtext ? `<span>${escapeHtml(subtext)}</span>` : '')}
        ${alertHtml}
      </div>
    </div>
  `;
}

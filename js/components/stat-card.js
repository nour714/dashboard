/**
 * AfricaTravel — Stat / KPI Card Component
 */

import { icons } from './icons.js';

export function renderStatCard(options) {
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
      ? icons.trendingUp('w-3 h-3')
      : (trendDirection === 'negative' ? icons.trendingDown('w-3 h-3') : '');
    trendHtml = `
      <span class="trend-indicator ${trendDirection}">
        ${trendIcon} ${trendText}
      </span>
    `;
  }

  let alertHtml = '';
  if (alertPill) {
    alertHtml = `<span class="badge badge-cancelled">${alertPill}</span>`;
  }

  let progressHtml = '';
  if (progress !== null && progress !== undefined) {
    progressHtml = `
      <div class="stat-progress-bar">
        <div class="stat-progress-fill" style="width: ${Math.min(100, Math.max(0, progress))}%;"></div>
      </div>
    `;
  }

  return `
    <div class="stat-card">
      <div class="stat-card-top">
        <span class="stat-card-label">${label}</span>
        <div class="stat-card-icon-wrap ${iconStyle}">
          ${iconSvg}
        </div>
      </div>
      <div class="stat-card-value ${alertPill ? 'highlight-danger' : ''}">${value}</div>
      ${progressHtml}
      <div class="stat-card-bottom">
        ${trendHtml || (subtext ? `<span>${subtext}</span>` : '')}
        ${alertHtml}
      </div>
    </div>
  `;
}

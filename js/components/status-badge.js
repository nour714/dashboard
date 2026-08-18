/**
 * AfricaTravel - Reusable Status Badge Component
 */

import { i18n } from '../i18n/i18n.js';
import { escapeHtml } from '../utils/security.js';

export function renderStatusBadge(status) {
  if (!status) return '';
  const s = String(status).toUpperCase();

  let badgeClass = 'badge-neutral';
  let labelKey = s;

  switch (s) {
    case 'PAID':
    case 'PAID IN FULL':
      badgeClass = 'badge-paid';
      labelKey = 'PAID';
      break;
    case 'PARTIALLY PAID':
      badgeClass = 'badge-partially-paid';
      labelKey = 'PARTIALLY PAID';
      break;
    case 'PENDING':
    case 'PENDING PAY':
      badgeClass = 'badge-pending-pay';
      labelKey = 'PENDING';
      break;
    case 'CONFIRMED':
    case 'ISSUED':
      badgeClass = 'badge-confirmed';
      labelKey = 'CONFIRMED';
      break;
    case 'MODIFIED':
      badgeClass = 'badge-modified';
      labelKey = 'MODIFIED';
      break;
    case 'REFUND REQUESTED':
      badgeClass = 'badge-refund-requested';
      labelKey = 'REFUND REQUESTED';
      break;
    case 'REFUNDED':
      badgeClass = 'badge-refunded';
      labelKey = 'REFUNDED';
      break;
    case 'CANCELLED':
      badgeClass = 'badge-cancelled';
      labelKey = 'CANCELLED';
      break;
    case 'COMPLETED':
      badgeClass = 'badge-completed';
      labelKey = 'COMPLETED';
      break;
    case 'BOOKED':
      badgeClass = 'badge-pending-pay';
      labelKey = 'BOOKED';
      break;
    case 'ACTIVE':
      badgeClass = 'badge-active';
      labelKey = 'ACTIVE';
      break;
    case 'INACTIVE':
      badgeClass = 'badge-neutral';
      labelKey = 'INACTIVE';
      break;
    case 'VIP':
      badgeClass = 'badge-vip';
      labelKey = 'VIP';
      break;
    default:
      badgeClass = 'badge-neutral';
      labelKey = s;
      break;
  }

  const translatedLabel = i18n.translateStatus(labelKey) || labelKey;

  return `<span class="badge ${badgeClass}"><span class="badge-dot"></span>${escapeHtml(translatedLabel)}</span>`;
}

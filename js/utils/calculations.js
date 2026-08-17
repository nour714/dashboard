/**
 * AfricaTravel — Calculations & Formatting Utilities
 *
 * Re-exports domain formulas and provides standard UI formatting utilities.
 */

export {
  calculateTotalPaid,
  calculateRemaining,
  calculateTotalModificationFees,
  calculateTotalRefunded,
  calculateAvailableRefund,
  calculateNetValue,
  derivePaymentStatus
} from '../domain/ticket-rules.js';

/**
 * Currency Formatter
 * @param {number} amount
 * @param {string} currency - E.g. 'EGP', 'USD', 'EUR', 'SAR', 'AED'
 * @returns {string}
 */
export function formatCurrency(amount = 0, currency = 'EGP') {
  const num = Number(amount) || 0;
  const formatted = num.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
  return `${formatted} ${currency}`;
}

/**
 * Format Compact Number for KPI Cards (e.g. 1.25M, 980K, 248)
 * @param {number} num
 * @returns {string}
 */
export function formatCompactNumber(num = 0) {
  const n = Number(num) || 0;
  if (n >= 1000000) {
    return (n / 1000000).toFixed(2).replace(/\.00$/, '') + 'M';
  }
  if (n >= 1000) {
    return (n / 1000).toFixed(0) + 'K';
  }
  return n.toLocaleString('en-US');
}

/**
 * Date Formatter (e.g. '24 Oct 2024')
 * @param {string|Date} dateVal
 * @returns {string}
 */
export function formatDate(dateVal) {
  if (!dateVal) return '--';
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return String(dateVal);
  return d.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

/**
 * Date & Time Formatter (e.g. '24 Oct 2024, 14:30')
 * @param {string|Date} dateVal
 * @returns {string}
 */
export function formatDateTime(dateVal) {
  if (!dateVal) return '--';
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return String(dateVal);
  const dateStr = d.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
  const timeStr = d.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  return `${dateStr}, ${timeStr}`;
}

/**
 * Relative time formatter (e.g., '2 mins ago', '1 hour ago')
 * @param {string|Date} dateVal
 * @returns {string}
 */
export function formatRelativeTime(dateVal) {
  if (!dateVal) return '';
  const now = new Date();
  const past = new Date(dateVal);
  const diffSec = Math.floor((now.getTime() - past.getTime()) / 1000);

  if (diffSec < 60) return 'Just now';
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)} mins ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)} hours ago`;
  if (diffSec < 604800) return `${Math.floor(diffSec / 86400)} days ago`;
  return formatDate(dateVal);
}

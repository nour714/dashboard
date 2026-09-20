/**
 * AfricaTravel - Calculations & Formatting Utilities
 *
 * Re-exports domain formulas and provides locale-aware UI formatting utilities.
 */

import { i18n } from '../i18n/i18n.js';

export {
  calculateTotalPaid,
  calculateRemaining,
  calculateTotalModificationFees,
  calculateTotalRefunded,
  calculateAvailableRefund,
  calculateNetValue,
  derivePaymentStatus,
  isModificationPayment,
  calculateModificationPaid
} from '../domain/ticket-rules.js';

/**
 * Currency Formatter
 * @param {number} amount
 * @param {string} currency - E.g. 'EGP', 'USD', 'EUR', 'SAR', 'AED'
 * @returns {string}
 */
export function formatCurrency(amount = 0, currency = 'EGP') {
  return i18n.formatCurrency(amount, currency);
}

/**
 * Formats a multi-currency breakdown or single amount.
 * If byCurrency is provided, formats each currency and joins them with '  |  '.
 * Never sums across currencies.
 * @param {Record<string, object|number>|null} byCurrency
 * @param {string} field
 * @param {string} [fallbackCurrency='EGP']
 * @returns {string}
 */
export function formatMultiCurrency(byCurrency, field, fallbackCurrency = 'EGP', fallbackValue = 0) {
  if (!byCurrency || typeof byCurrency !== 'object' || Object.keys(byCurrency).length === 0) {
    if (fallbackValue === null || fallbackValue === undefined) return 'N/A';
    return formatCurrency(fallbackValue, fallbackCurrency);
  }
  const entries = Object.entries(byCurrency);
  if (entries.length === 1) {
    const [curr, data] = entries[0];
    const val = typeof data === 'object' && data !== null ? data[field] : data;
    if (val === null || val === undefined) return 'N/A';
    return formatCurrency(val, curr);
  }
  return entries
    .map(([curr, data]) => {
      const val = typeof data === 'object' && data !== null ? data[field] : data;
      if (val === null || val === undefined) return `N/A ${curr}`;
      return formatCurrency(val, curr);
    })
    .join('  |  ');
}

/**
 * Format Compact Number for KPI Cards (e.g. 1.25M, 980K, 248)
 * @param {number} num
 * @returns {string}
 */
export function formatCompactNumber(num = 0) {
  return i18n.formatCompactNumber(num);
}

/**
 * Date Formatter (e.g. '24 Oct 2024')
 * @param {string|Date} dateVal
 * @returns {string}
 */
export function formatDate(dateVal) {
  return i18n.formatDate(dateVal);
}

/**
 * Date & Time Formatter (e.g. '24 Oct 2024, 14:30')
 * @param {string|Date} dateVal
 * @returns {string}
 */
export function formatDateTime(dateVal) {
  return i18n.formatDateTime(dateVal);
}

/**
 * Relative time formatter (e.g., '2 mins ago', '1 hour ago')
 * @param {string|Date} dateVal
 * @returns {string}
 */
export function formatRelativeTime(dateVal) {
  return i18n.formatRelativeTime(dateVal);
}

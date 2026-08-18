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
  derivePaymentStatus
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

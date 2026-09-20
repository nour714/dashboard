/**
 * AfricaTravel - Security & Safe DOM Utilities
 *
 * Prevents Cross-Site Scripting (XSS) when rendering dynamic user data.
 */

/**
 * Escapes unsafe characters in strings to HTML entities
 * @param {string|any} str
 * @returns {string}
 */
export function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  const s = String(str);
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Safely sanitizes text for attributes or text nodes
 * @param {string} text
 * @returns {string}
 */
export function sanitizeText(text) {
  return escapeHtml(text).trim();
}

/**
 * Neutralizes CSV formula injection vulnerabilities for spreadsheet applications.
 * If cell starts with '=', '+', '-', '@', '\t', or '\r', prefixes with a single quote.
 * @param {any} value
 * @returns {string}
 */
export function sanitizeCsvCell(value) {
  if (value === null || value === undefined) return '""';
  let str = String(value);
  if (/^[=+\-@\t\r]/.test(str)) {
    str = "'" + str;
  }
  return '"' + str.replace(/"/g, '""') + '"';
}

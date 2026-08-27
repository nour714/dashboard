/**
 * AfricaTravel — Internationalization (i18n) & Direction Core Module
 */

import { en } from './locales/en.js';
import { ar } from './locales/ar.js';

const STORAGE_KEY = 'africatravel.language';
const dictionaries = { en, ar };

class I18nManager {
  constructor() {
    this.currentLanguage = this.detectInitialLanguage();
    this.applyDocumentAttributes();
  }

  detectInitialLanguage() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === 'ar' || stored === 'en') {
        return stored;
      }
      // Check browser language preference if no explicit user stored choice
      if (typeof navigator !== 'undefined' && navigator.language && navigator.language.startsWith('ar')) {
        return 'ar';
      }
    } catch {
      // Storage access disabled or in test mock
    }
    return 'en';
  }

  getLanguage() {
    return this.currentLanguage;
  }

  getDirection() {
    return this.currentLanguage === 'ar' ? 'rtl' : 'ltr';
  }

  isRTL() {
    return this.getDirection() === 'rtl';
  }

  setLanguage(lang) {
    if (lang !== 'en' && lang !== 'ar') return;
    if (this.currentLanguage === lang) return;

    this.currentLanguage = lang;
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch {
      // Ignore storage errors
    }

    this.applyDocumentAttributes();

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('AfricaTravel:language-changed', {
        detail: {
          language: this.currentLanguage,
          direction: this.getDirection()
        }
      }));
    }
  }

  toggleLanguage() {
    const next = this.currentLanguage === 'ar' ? 'en' : 'ar';
    this.setLanguage(next);
    return next;
  }

  applyDocumentAttributes() {
    if (typeof document !== 'undefined' && document.documentElement) {
      document.documentElement.lang = this.currentLanguage;
      document.documentElement.dir = this.getDirection();
    }
  }

  /**
   * Check if a translation key exists in current language or fallback (en) dictionary
   * @param {string} key
   * @returns {boolean}
   */
  has(key) {
    if (!key || typeof key !== 'string') return false;
    const keys = key.split('.');
    const currentVal = this.lookup(dictionaries[this.currentLanguage], keys);
    if (currentVal !== undefined) return true;
    if (this.currentLanguage !== 'en') {
      return this.lookup(dictionaries.en, keys) !== undefined;
    }
    return false;
  }

  /**
   * Translate a nested key path with optional replacement parameters and fallback
   * e.g. t('nav.dashboard') or t('time.minsAgo', { n: 5 }) or t('roles.custom', 'Custom Role')
   * @param {string} key
   * @param {Object|string} params - Parameters object or fallback string
   * @param {string} [fallback] - Explicit fallback if key is missing
   */
  t(key, params = {}, fallback = undefined) {
    let actualParams = params;
    let actualFallback = fallback;

    if (typeof params === 'string') {
      actualFallback = params;
      actualParams = {};
    } else if (!actualParams || typeof actualParams !== 'object') {
      actualParams = {};
    }

    if (!key || typeof key !== 'string') {
      return actualFallback !== undefined ? actualFallback : '';
    }

    const keys = key.split('.');
    let value = this.lookup(dictionaries[this.currentLanguage], keys);

    // Fallback to English dictionary
    if (value === undefined && this.currentLanguage !== 'en') {
      value = this.lookup(dictionaries.en, keys);
    }

    // Fallback if translation not found
    if (value === undefined) {
      return actualFallback !== undefined ? actualFallback : key;
    }

    if (typeof value !== 'string') {
      return value;
    }

    // Interpolate {param} placeholders
    return Object.keys(actualParams).reduce((str, paramKey) => {
      const regex = new RegExp(`\\{${paramKey}\\}`, 'g');
      return str.replace(regex, actualParams[paramKey]);
    }, value);
  }

  /**
   * Get localized or direct role label for a user object or role/title string
   * - If custom title is provided and matches a known translation key, translates it.
   * - If custom title is provided and not in dictionary, returns the title directly (never raw roles.Title).
   * - If no custom title, falls back to user role translated via roles.* dictionary.
   * @param {Object|string} userOrRole
   * @returns {string}
   */
  getUserRoleLabel(userOrRole) {
    if (!userOrRole) return 'Senior Operations Director';

    if (typeof userOrRole === 'object') {
      const title = (userOrRole.title || '').trim();
      if (title) {
        const titleKey = `roles.${title}`;
        return this.has(titleKey) ? this.t(titleKey) : title;
      }
      const role = (userOrRole.role || '').trim() || 'Senior Operations Director';
      const roleKey = `roles.${role}`;
      return this.t(roleKey, role);
    }

    const raw = String(userOrRole).trim();
    if (!raw) return 'Senior Operations Director';
    const key = `roles.${raw}`;
    return this.has(key) ? this.t(key) : raw;
  }

  lookup(obj, keys) {
    let current = obj;
    for (const k of keys) {
      if (current && typeof current === 'object' && k in current) {
        current = current[k];
      } else {
        return undefined;
      }
    }
    return current;
  }

  /**
   * Translate dynamic status code to localized label
   */
  translateStatus(statusKey) {
    if (!statusKey) return '';
    const normalized = String(statusKey).trim();
    const key = `status.${normalized}`;
    const direct = this.t(key);
    if (direct !== key) return direct;

    const under = `status.${normalized.replace(/\s+/g, '_')}`;
    const underVal = this.t(under);
    if (underVal !== under) return underVal;

    return normalized;
  }

  /**
   * Locale-aware Currency Formatter
   * @param {number} amount
   * @param {string} currency - 'EGP', 'USD', 'EUR', 'SAR', 'AED'
   * @returns {string} E.g. "18,500 EGP" or "18,500 جنيه مصري"
   */
  formatCurrency(amount = 0, currency = 'EGP') {
    const num = Number(amount) || 0;
    // Format number using standard Western Arabic digits for financial & airline clarity
    const numStr = num.toLocaleString('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    });

    if (this.currentLanguage === 'ar') {
      const arCurrencies = {
        EGP: 'جنيه مصري',
        USD: 'دولار أمريكي',
        EUR: 'يورو',
        SAR: 'ريال سعودي',
        AED: 'درهم إماراتي'
      };
      const curLabel = arCurrencies[currency] || currency;
      return `${numStr} ${curLabel}`;
    }

    return `${numStr} ${currency}`;
  }

  /**
   * Format Compact Number for KPI Cards (e.g. 1.25M, 980K, 248)
   */
  formatCompactNumber(num = 0) {
    const n = Number(num) || 0;
    if (n >= 1000000) {
      const val = (n / 1000000).toFixed(2).replace(/\.00$/, '');
      return `${val}M`;
    }
    if (n >= 1000) {
      const val = (n / 1000).toFixed(0);
      return `${val}K`;
    }
    return n.toLocaleString('en-US');
  }

  /**
   * Locale-aware Date Formatter (e.g. '24 Oct 2024' or '24 أكتوبر 2024')
   */
  formatDate(dateVal, customOptions = null) {
    if (!dateVal) return '--';
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return String(dateVal);

    const locale = this.currentLanguage === 'ar' ? 'ar-EG-u-nu-latn' : 'en-GB';
    const defaultOptions = {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    };

    return d.toLocaleDateString(locale, customOptions || defaultOptions);
  }

  /**
   * Locale-aware Date & Time Formatter (e.g. '24 Oct 2024, 14:30' or '24 أكتوبر 2024، 14:30')
   */
  formatDateTime(dateVal) {
    if (!dateVal) return '--';
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return String(dateVal);

    const locale = this.currentLanguage === 'ar' ? 'ar-EG-u-nu-latn' : 'en-GB';
    const dateStr = d.toLocaleDateString(locale, {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
    const timeStr = d.toLocaleTimeString(locale, {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });

    const sep = this.currentLanguage === 'ar' ? '، ' : ', ';
    return `${dateStr}${sep}${timeStr}`;
  }

  /**
   * Localized Relative Time Formatter
   */
  formatRelativeTime(dateVal) {
    if (!dateVal) return '';
    const now = new Date();
    const past = new Date(dateVal);
    const diffSec = Math.floor((now.getTime() - past.getTime()) / 1000);

    if (diffSec < 60) {
      return this.t('time.justNow');
    }
    if (diffSec < 3600) {
      const mins = Math.floor(diffSec / 60);
      return this.t('time.minsAgo', { n: mins });
    }
    if (diffSec < 86400) {
      const hours = Math.floor(diffSec / 3600);
      return this.t('time.hoursAgo', { n: hours });
    }
    if (diffSec < 604800) {
      const days = Math.floor(diffSec / 86400);
      return this.t('time.daysAgo', { n: days });
    }
    return this.formatDate(dateVal);
  }
}

export const i18n = new I18nManager();
export const t = (key, params, fallback) => i18n.t(key, params, fallback);
export const has = (key) => i18n.has(key);
export const getUserRoleLabel = (userOrRole) => i18n.getUserRoleLabel(userOrRole);

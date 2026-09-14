import assert from 'node:assert/strict';
import { test, describe, beforeEach, afterEach } from 'node:test';
import { formatCurrency, formatCompactNumber } from '../../js/utils/calculations.js';
import { i18n } from '../../js/i18n/i18n.js';

describe('Frontend Calculations & Formatting: calculations.js', () => {
  let initialLang;

  beforeEach(() => {
    initialLang = i18n.getLanguage();
    i18n.setLanguage('en');
  });

  afterEach(() => {
    i18n.setLanguage(initialLang);
  });

  describe('formatCurrency', () => {
    test('formats whole numbers in English with thousands separator and currency code', () => {
      assert.strictEqual(formatCurrency(5000, 'EGP'), '5,000 EGP');
      assert.strictEqual(formatCurrency(1000000, 'USD'), '1,000,000 USD');
    });

    test('formats decimal numbers rounded to maximum 2 fractional digits', () => {
      assert.strictEqual(formatCurrency(1234.567, 'USD'), '1,234.57 USD');
      assert.strictEqual(formatCurrency(1234.5, 'EUR'), '1,234.5 EUR');
    });

    test('handles 0 and empty/null/undefined amount by defaulting to 0', () => {
      assert.strictEqual(formatCurrency(0, 'EGP'), '0 EGP');
      assert.strictEqual(formatCurrency(null, 'EGP'), '0 EGP');
      assert.strictEqual(formatCurrency(undefined, 'EGP'), '0 EGP');
    });

    test('formats different currency symbols and codes', () => {
      assert.strictEqual(formatCurrency(350.75, 'SAR'), '350.75 SAR');
      assert.strictEqual(formatCurrency(890, 'AED'), '890 AED');
    });

    test('formats localized currency names when language is Arabic', () => {
      i18n.setLanguage('ar');
      assert.strictEqual(formatCurrency(5000, 'EGP'), '5,000 جنيه مصري');
      assert.strictEqual(formatCurrency(250.50, 'USD'), '250.5 دولار أمريكي');
      assert.strictEqual(formatCurrency(100, 'EUR'), '100 يورو');
      assert.strictEqual(formatCurrency(700, 'SAR'), '700 ريال سعودي');
      assert.strictEqual(formatCurrency(450, 'AED'), '450 درهم إماراتي');
    });
  });

  describe('formatCompactNumber', () => {
    test('formats millions with M suffix', () => {
      assert.strictEqual(formatCompactNumber(1250000), '1.25M');
      assert.strictEqual(formatCompactNumber(2000000), '2M');
    });

    test('formats thousands with K suffix', () => {
      assert.strictEqual(formatCompactNumber(980000), '980K');
      assert.strictEqual(formatCompactNumber(5000), '5K');
    });

    test('keeps small numbers as standard digits', () => {
      assert.strictEqual(formatCompactNumber(248), '248');
      assert.strictEqual(formatCompactNumber(0), '0');
    });
  });
});

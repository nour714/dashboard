import assert from 'node:assert/strict';
import { test, describe, beforeEach, afterEach } from 'node:test';
import { i18n, t } from '../../js/i18n/i18n.js';

describe('Frontend Internationalization: i18n.js', () => {
  let originalLanguage;

  beforeEach(() => {
    originalLanguage = i18n.getLanguage();
  });

  afterEach(() => {
    i18n.setLanguage(originalLanguage);
  });

  test('t returns correct text for modals.modifyFlight.title in both English and Arabic', () => {
    i18n.setLanguage('en');
    assert.strictEqual(t('modals.modifyFlight.title'), 'Modify Flight Schedule');

    i18n.setLanguage('ar');
    assert.strictEqual(t('modals.modifyFlight.title'), 'تعديل جدول الرحلة');
  });

  test('t returns sensible fallback without breaking when key does not exist', () => {
    // When explicit fallback string is provided:
    assert.strictEqual(t('missing.unknown.deep.key', 'Default Fallback'), 'Default Fallback');

    // When no fallback is provided, returns the key itself:
    assert.strictEqual(t('missing.unknown.deep.key'), 'missing.unknown.deep.key');

    // Safe handling of null, undefined, or empty string:
    assert.strictEqual(t(null), '');
    assert.strictEqual(t(undefined), '');
    assert.strictEqual(t(''), '');
  });

  test('t supports parameter interpolation', () => {
    i18n.setLanguage('en');
    const res = t('time.minsAgo', { n: 5 });
    assert.strictEqual(res, '5 mins ago');
  });

  test('language switching updates direction and isRTL correctly', () => {
    i18n.setLanguage('en');
    assert.strictEqual(i18n.getLanguage(), 'en');
    assert.strictEqual(i18n.getDirection(), 'ltr');
    assert.strictEqual(i18n.isRTL(), false);

    i18n.setLanguage('ar');
    assert.strictEqual(i18n.getLanguage(), 'ar');
    assert.strictEqual(i18n.getDirection(), 'rtl');
    assert.strictEqual(i18n.isRTL(), true);
  });

  test('has() checks key existence accurately across languages', () => {
    assert.strictEqual(i18n.has('modals.modifyFlight.title'), true);
    assert.strictEqual(i18n.has('completely.fake.nonexistent.key'), false);
  });
});

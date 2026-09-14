import assert from 'node:assert/strict';
import { test, describe } from 'node:test';
import { escapeHtml, sanitizeText } from '../../../frontend/js/utils/security.js';

describe('Frontend Security Utilities: security.js', () => {
  describe('escapeHtml', () => {
    test('escapes script tags to HTML entities', () => {
      const input = '<script>alert(1)</script>';
      const expected = '&lt;script&gt;alert(1)&lt;/script&gt;';
      assert.strictEqual(escapeHtml(input), expected);
    });

    test('returns empty string when input is null or undefined without throwing', () => {
      assert.strictEqual(escapeHtml(null), '');
      assert.strictEqual(escapeHtml(undefined), '');
    });

    test('escapes all dangerous XSS characters (&, <, >, ", \')', () => {
      assert.strictEqual(escapeHtml('&'), '&amp;');
      assert.strictEqual(escapeHtml('<'), '&lt;');
      assert.strictEqual(escapeHtml('>'), '&gt;');
      assert.strictEqual(escapeHtml('"'), '&quot;');
      assert.strictEqual(escapeHtml("'"), '&#039;');
    });

    test('escapes combined payload with quotes, attributes, and tags', () => {
      const payload = `<img src="x" onerror='alert("XSS & Bad")'>`;
      const expected = '&lt;img src=&quot;x&quot; onerror=&#039;alert(&quot;XSS &amp; Bad&quot;)&#039;&gt;';
      assert.strictEqual(escapeHtml(payload), expected);
    });

    test('converts numbers and booleans safely to strings without escaping them', () => {
      assert.strictEqual(escapeHtml(12345), '12345');
      assert.strictEqual(escapeHtml(0), '0');
      assert.strictEqual(escapeHtml(false), 'false');
      assert.strictEqual(escapeHtml(true), 'true');
    });
  });

  describe('sanitizeText', () => {
    test('escapes HTML and trims whitespace', () => {
      const input = '   <b>Hello World</b>   ';
      assert.strictEqual(sanitizeText(input), '&lt;b&gt;Hello World&lt;/b&gt;');
    });

    test('handles null and undefined safely', () => {
      assert.strictEqual(sanitizeText(null), '');
      assert.strictEqual(sanitizeText(undefined), '');
    });
  });
});

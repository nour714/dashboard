import assert from 'node:assert/strict';
import { test, describe } from 'node:test';
import { escapeHtml, sanitizeText, sanitizeCsvCell, sanitizePath } from '../../../frontend/js/utils/security.js';

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

  describe('sanitizeCsvCell (CSV Formula Injection Protection)', () => {
    test('neutralizes formula injection triggers (=, +, -, @, \\t, \\r)', () => {
      assert.strictEqual(sanitizeCsvCell('=1+2'), '"\'=1+2"');
      assert.strictEqual(sanitizeCsvCell("+cmd|' /C calc'!A0"), '"\'+cmd|\' /C calc\'!A0"');
      assert.strictEqual(sanitizeCsvCell('-5'), '"\'-5"');
      assert.strictEqual(sanitizeCsvCell('@SUM(A1:A10)'), '"\'@SUM(A1:A10)"');
      assert.strictEqual(sanitizeCsvCell('\ttabbed'), '"\'\ttabbed"');
      assert.strictEqual(sanitizeCsvCell('\rcarriage'), '"\'\rcarriage"');
    });

    test('properly escapes quotes for safe text', () => {
      assert.strictEqual(sanitizeCsvCell('Normal "Quoted" Text'), '"Normal ""Quoted"" Text"');
    });

    test('handles null and undefined without throwing', () => {
      assert.strictEqual(sanitizeCsvCell(null), '""');
      assert.strictEqual(sanitizeCsvCell(undefined), '""');
    });
  });

  describe('sanitizePath (Client-side URL Path Sanitization)', () => {
    test('returns clean paths unchanged', () => {
      assert.strictEqual(sanitizePath('/dashboard'), '/dashboard');
      assert.strictEqual(sanitizePath('/tickets/TK-101'), '/tickets/TK-101');
      assert.strictEqual(sanitizePath('/customers?q=john'), '/customers?q=john');
    });

    test('strips dangerous HTML/script injection characters', () => {
      assert.strictEqual(sanitizePath('/tickets/<script>alert(1)</script>'), '/tickets/scriptalert(1)/script');
      assert.strictEqual(sanitizePath('/tickets/"onload="alert(1)'), '/tickets/onload=alert(1)');
      assert.strictEqual(sanitizePath('/tickets/\'onmouseover=\'alert(1)'), '/tickets/onmouseover=alert(1)');
    });

    test('falls back to /dashboard on falsy or non-string inputs', () => {
      assert.strictEqual(sanitizePath(''), '/dashboard');
      assert.strictEqual(sanitizePath(null), '/dashboard');
      assert.strictEqual(sanitizePath(undefined), '/dashboard');
      assert.strictEqual(sanitizePath(123), '/dashboard');
    });
  });
});


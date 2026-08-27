/**
 * AfricaTravel - Ticket Payment Status Lifecycle Tests
 */

import { test, describe } from 'node:test';
import assert from 'node:assert';
import { derivePaymentStatus } from '../server/src/domain/ticket-rules.js';
import { derivePaymentStatus as frontendDerivePaymentStatus } from '../js/domain/ticket-rules.js';
import { updateTicketSchema } from '../server/src/schemas/ticket.schema.js';
import { renderStatusBadge } from '../js/components/status-badge.js';
import { i18n } from '../js/i18n/i18n.js';

describe('Ticket Payment Status Lifecycle and Financial Transitions', () => {
  test('derivePaymentStatus frontend and backend functions produce identical results', () => {
    const testCases = [
      { price: 10000, paid: 0, status: 'UNPAID', expected: 'UNPAID' },
      { price: 10000, paid: 3000, status: 'UNPAID', expected: 'PARTIALLY PAID' },
      { price: 10000, paid: 10000, status: 'PARTIALLY PAID', expected: 'CONFIRMED' },
      { price: 10000, paid: 12000, status: 'CONFIRMED', expected: 'CONFIRMED' },
      { price: 10000, paid: 10000, status: 'CANCELLED', expected: 'CANCELLED' },
      { price: 10000, paid: 10000, status: 'REFUNDED', expected: 'REFUNDED' },
      { price: 10000, paid: 10000, status: 'PARTIALLY_REFUNDED', expected: 'PARTIALLY_REFUNDED' },
    ];

    for (const tc of testCases) {
      const backendRes = derivePaymentStatus(tc.price, tc.paid, tc.status);
      const frontendRes = frontendDerivePaymentStatus(tc.price, tc.paid, tc.status);
      assert.strictEqual(backendRes, tc.expected);
      assert.strictEqual(frontendRes, tc.expected);
      assert.strictEqual(backendRes, frontendRes);
    }
  });

  test('Ticket lifecycle from unpaid to partially paid to confirmed', () => {
    const ticketPrice = 18500;

    // 1. Fresh ticket creation with 0 payments
    let totalPaid = 0;
    let status = derivePaymentStatus(ticketPrice, totalPaid, 'UNPAID');
    assert.strictEqual(status, 'UNPAID', 'Initial state with 0 paid is UNPAID');

    // 2. Customer makes first partial payment of 10,000 EGP
    totalPaid += 10000;
    status = derivePaymentStatus(ticketPrice, totalPaid, status);
    assert.strictEqual(status, 'PARTIALLY PAID', 'State after partial payment is PARTIALLY PAID');

    // 3. Customer pays remaining 8,500 EGP balance
    totalPaid += 8500;
    status = derivePaymentStatus(ticketPrice, totalPaid, status);
    assert.strictEqual(status, 'CONFIRMED', 'State after full balance paid off is CONFIRMED');
  });

  test('Ticket status schema validation accepts all valid statuses', () => {
    const validStatuses = [
      'CONFIRMED',
      'PARTIALLY PAID',
      'UNPAID',
      'PAID',
      'PAID IN FULL',
      'PENDING',
      'PENDING PAY',
      'PENDING PAYMENT',
      'CANCELLED',
      'REFUNDED',
      'PARTIALLY_REFUNDED'
    ];

    for (const st of validStatuses) {
      const res = updateTicketSchema.safeParse({ status: st });
      assert.strictEqual(res.success, true, `Schema should accept status: ${st}`);
    }
  });

  test('Bilingual status labels in English and Arabic', () => {
    i18n.setLanguage('en');
    assert.strictEqual(i18n.translateStatus('CONFIRMED'), 'CONFIRMED');
    assert.strictEqual(i18n.translateStatus('PARTIALLY PAID'), 'PARTIALLY PAID');
    assert.strictEqual(i18n.translateStatus('UNPAID'), 'UNPAID');

    i18n.setLanguage('ar');
    assert.strictEqual(i18n.translateStatus('CONFIRMED'), 'مؤكدة');
    assert.strictEqual(i18n.translateStatus('PARTIALLY PAID'), 'مدفوعة جزئيًا');
    assert.strictEqual(i18n.translateStatus('UNPAID'), 'غير مدفوعة');
  });

  test('Status badge rendering produces expected CSS classes and translated text', () => {
    i18n.setLanguage('en');
    const badgeConfirmed = renderStatusBadge('CONFIRMED');
    assert(badgeConfirmed.includes('badge-confirmed'), 'CONFIRMED badge has badge-confirmed class');
    assert(badgeConfirmed.includes('CONFIRMED'), 'CONFIRMED badge contains CONFIRMED text');

    const badgePartial = renderStatusBadge('PARTIALLY PAID');
    assert(badgePartial.includes('badge-partially-paid'), 'PARTIALLY PAID badge has badge-partially-paid class');
    assert(badgePartial.includes('PARTIALLY PAID'), 'PARTIALLY PAID badge contains PARTIALLY PAID text');

    const badgeUnpaid = renderStatusBadge('UNPAID');
    assert(badgeUnpaid.includes('badge-unpaid'), 'UNPAID badge has badge-unpaid class');
    assert(badgeUnpaid.includes('UNPAID'), 'UNPAID badge contains UNPAID text');

    i18n.setLanguage('ar');
    const badgeConfirmedAr = renderStatusBadge('CONFIRMED');
    assert(badgeConfirmedAr.includes('مؤكدة'), 'Arabic confirmed badge contains مؤكدة');

    const badgePartialAr = renderStatusBadge('PARTIALLY PAID');
    assert(badgePartialAr.includes('مدفوعة جزئيًا'), 'Arabic partial badge contains مدفوعة جزئيًا');

    const badgeUnpaidAr = renderStatusBadge('UNPAID');
    assert(badgeUnpaidAr.includes('غير مدفوعة'), 'Arabic unpaid badge contains غير مدفوعة');
  });
});

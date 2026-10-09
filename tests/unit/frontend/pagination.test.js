/**
 * AfricaTravel — Pagination Component & Page Integration Unit Tests
 */

import assert from 'node:assert/strict';
import { test, describe, beforeEach, afterEach } from 'node:test';
import { getPaginationRange, renderPagination } from '../../../frontend/js/components/pagination.js';
import { TicketsPage } from '../../../frontend/js/pages/tickets.js';
import { DueTicketsPage } from '../../../frontend/js/pages/due-tickets.js';
import { i18n } from '../../../frontend/js/i18n/i18n.js';

describe('Pagination Component & Logic', () => {
  let originalLang;

  beforeEach(() => {
    originalLang = i18n.getLanguage();
    i18n.setLanguage('en');
  });

  afterEach(() => {
    i18n.setLanguage(originalLang);
  });

  test('getPaginationRange returns sequential numbers when totalPages <= 7', () => {
    assert.deepStrictEqual(getPaginationRange(1, 1), [1]);
    assert.deepStrictEqual(getPaginationRange(1, 3), [1, 2, 3]);
    assert.deepStrictEqual(getPaginationRange(2, 5), [1, 2, 3, 4, 5]);
    assert.deepStrictEqual(getPaginationRange(4, 7), [1, 2, 3, 4, 5, 6, 7]);
  });

  test('getPaginationRange generates smart ellipses for large page counts', () => {
    // Near beginning
    const startRange = getPaginationRange(1, 10);
    assert.deepStrictEqual(startRange, [1, 2, '...', 10]);

    // In middle
    const midRange = getPaginationRange(5, 10);
    assert.deepStrictEqual(midRange, [1, '...', 4, 5, 6, '...', 10]);

    // Near end
    const endRange = getPaginationRange(10, 10);
    assert.deepStrictEqual(endRange, [1, '...', 9, 10]);
  });

  test('getPaginationRange clamps out-of-range currentPage gracefully', () => {
    assert.deepStrictEqual(getPaginationRange(0, 5), [1, 2, 3, 4, 5]);
    assert.deepStrictEqual(getPaginationRange(99, 5), [1, 2, 3, 4, 5]);
  });

  test('renderPagination produces accessible markup and proper button states', () => {
    const html = renderPagination({
      currentPage: 1,
      totalPages: 3,
      totalItems: 25,
      pageSize: 10,
      countLabelId: 'test-count'
    });

    // Check count label
    assert.ok(html.includes('id="test-count"'), 'Should render countLabelId');
    assert.ok(html.includes('<strong>1-10</strong>'), 'Should display range 1-10');
    assert.ok(html.includes('<strong>25</strong>'), 'Should display total 25');

    // Check navigation element & ARIA
    assert.ok(html.includes('role="navigation"'), 'Should have role navigation');
    assert.ok(html.includes('aria-label="Pagination"'), 'Should have aria-label for nav');

    // Previous button should be disabled on page 1
    assert.match(html, /<button[^>]*data-page-action="prev"[^>]*disabled/, 'Previous button must be disabled on page 1');

    // Next button should be enabled
    assert.ok(html.includes('data-page-action="next"'), 'Next button must exist');
    assert.doesNotMatch(html, /<button[^>]*data-page-action="next"[^>]*disabled/, 'Next button must not be disabled on page 1');

    // Page 1 is active
    assert.match(html, /class="pagination-btn active"[\s\S]*?data-page="1"/, 'Page 1 must be active');
    assert.match(html, /data-page="1"[\s\S]*?aria-current="page"/, 'Page 1 must have aria-current');

    // Page 2 and 3 exist
    assert.ok(html.includes('data-page="2"'), 'Page 2 button must exist');
    assert.ok(html.includes('data-page="3"'), 'Page 3 button must exist');
  });

  test('renderPagination disables next button on the last page', () => {
    const html = renderPagination({
      currentPage: 3,
      totalPages: 3,
      totalItems: 25,
      pageSize: 10
    });

    assert.match(html, /<button[^>]*data-page-action="next"[^>]*disabled/, 'Next button must be disabled on page 3 of 3');
    assert.doesNotMatch(html, /<button[^>]*data-page-action="prev"[^>]*disabled/, 'Previous button must be enabled on page 3');
    assert.match(html, /class="pagination-btn active"[\s\S]*?data-page="3"/, 'Page 3 must be active');
  });

  test('renderPagination supports Arabic localization', () => {
    i18n.setLanguage('ar');

    const html = renderPagination({
      currentPage: 2,
      totalPages: 4,
      totalItems: 40,
      pageSize: 10
    });

    assert.ok(html.includes('عرض') || html.includes('Showing'), 'Should include localized showing text');
    assert.ok(html.includes('صفحة 2') || html.includes('Page 2'), 'Should include localized page label in aria-label');
  });
});

describe('Page Pagination Integration', () => {
  const sampleTickets = Array.from({ length: 25 }, (_, i) => ({
    id: `TKT-${String(i + 1).padStart(3, '0')}`,
    ticketNumber: `176-${1000 + i}`,
    pnr: `PNR${100 + i}`,
    passengerName: `Passenger ${i + 1}`,
    phone: '+20100000000',
    airline: 'EgyptAir',
    airlineCode: 'MS',
    origin: 'CAI',
    destination: 'DXB',
    departureDate: '2026-10-15T10:00:00Z',
    ticketPrice: 10000,
    payments: [],
    status: 'UNPAID'
  }));

  test('TicketsPage renders dynamic pagination with total pages and items', () => {
    const paged = sampleTickets.slice(0, 10);
    const html = TicketsPage.renderCardContent(paged, 25, 1, 3);

    assert.ok(html.includes('pagination-controls'), 'Must render pagination controls');
    assert.ok(html.includes('data-page="1"'), 'Must have page 1 button');
    assert.ok(html.includes('data-page="2"'), 'Must have page 2 button');
    assert.ok(html.includes('data-page="3"'), 'Must have page 3 button');
    assert.ok(html.includes('1-10'), 'Must show current item range 1-10');
    assert.ok(html.includes('25'), 'Must show total count 25');
  });

  test('DueTicketsPage renders dynamic pagination with total pages and items', () => {
    const paged = sampleTickets.slice(10, 20);
    const html = DueTicketsPage.renderCardContent(paged, 25, 2, 3);

    assert.ok(html.includes('pagination-controls'), 'Must render pagination controls');
    assert.match(html, /class="pagination-btn active"[\s\S]*?data-page="2"/, 'Page 2 must be active');
    assert.ok(html.includes('11-20'), 'Must show current item range 11-20');
    assert.ok(html.includes('25'), 'Must show total count 25');
  });
});

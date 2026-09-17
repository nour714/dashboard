import assert from 'node:assert/strict';
import { test, describe, beforeEach } from 'node:test';
import { JSDOM } from 'jsdom';

// Setup global DOM environment before importing modules that reference document/window
const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
  url: 'http://localhost:3000'
});

global.window = dom.window;
global.document = dom.window.document;
global.requestAnimationFrame = (fn) => setTimeout(fn, 0);
global.CustomEvent = dom.window.CustomEvent;
global.localStorage = dom.window.localStorage;

// Dynamic import or regular import now that globals exist
const { openModifyFlightModal, openEditTicketModal } = await import('../../../frontend/js/pages/ticket-details/ticket-actions.js');
const { renderModificationsTab } = await import('../../../frontend/js/pages/ticket-details/modifications-tab.js');
const { closeModal } = await import('../../../frontend/js/components/modal.js');

describe('Frontend Modal Rendering: modal-rendering.test.js', () => {
  const mockTicket = {
    id: 'TK-101',
    passengerName: 'Mahmoud Hassan',
    phone: '+201001234567',
    pnr: 'PNR789',
    ticketNumber: '077-1234567890',
    flightNumber: 'MS 901',
    origin: 'CAI',
    destination: 'JED',
    seat: '14B',
    departureDate: '2026-10-15T08:00:00.000Z',
    arrivalDate: '2026-10-15T11:00:00.000Z',
    currency: 'EGP'
  };

  beforeEach(() => {
    // Reset body before each test
    closeModal();
    document.body.innerHTML = '';
  });

  test('openEditTicketModal applies escapeHtml and does not leak executable script tags', () => {
    const maliciousTicket = {
      ...mockTicket,
      id: 'TK-XSS',
      passengerName: '<script>alert("XSS")</script>',
      phone: '"><script>alert(2)</script>'
    };

    openEditTicketModal(maliciousTicket);

    // 1. Ensure NO real/live script tags exist anywhere in the DOM inside body
    const scriptElements = document.body.querySelectorAll('script');
    assert.strictEqual(scriptElements.length, 0, 'No executable <script> tags should exist in the DOM');

    // 2. Ensure modal elements rendered properly
    const modalBody = document.body.querySelector('.modal-body');
    assert.ok(modalBody, 'Modal body was rendered');

    // 3. Verify that quote-injection attempt did NOT break out of the input attribute
    const phoneInput = document.body.querySelector('#edit-pax-phone');
    assert.ok(phoneInput, '#edit-pax-phone input exists');
    assert.strictEqual(phoneInput.tagName.toLowerCase(), 'input');
    // If quote wasn't escaped, the closing tag > would have broken out and created siblings
    assert.strictEqual(phoneInput.value, '"><script>alert(2)</script>');

    // 4. The passenger name input element value safely holds the string without executing
    const nameInput = document.body.querySelector('#edit-pax-name');
    assert.ok(nameInput, '#edit-pax-name input exists');
    assert.strictEqual(nameInput.value, '<script>alert("XSS")</script>');
    assert.strictEqual(document.querySelectorAll('script').length, 0);
  });

  test('openModifyFlightModal renders separate fields for mod-airline-fee and mod-change-fee', () => {
    openModifyFlightModal(mockTicket);

    // Verify backdrop and form are rendered
    const backdrop = document.body.querySelector('.modal-backdrop');
    assert.ok(backdrop, 'Modal backdrop was added to the DOM');

    const form = document.body.querySelector('#modify-flight-form');
    assert.ok(form, 'Modify flight form is rendered');

    // Verify Airline Modification Fee input exists with correct attributes
    const airlineFeeInput = document.body.querySelector('#mod-airline-fee');
    assert.ok(airlineFeeInput, '#mod-airline-fee input must be rendered in the DOM');
    assert.strictEqual(airlineFeeInput.getAttribute('type'), 'number');
    assert.strictEqual(airlineFeeInput.getAttribute('min'), '0');

    // Verify Customer Change Fee input exists with correct attributes
    const changeFeeInput = document.body.querySelector('#mod-change-fee');
    assert.ok(changeFeeInput, '#mod-change-fee input must be rendered in the DOM');
    assert.strictEqual(changeFeeInput.getAttribute('type'), 'number');
    assert.strictEqual(changeFeeInput.getAttribute('min'), '0');

    // Verify labels for both fields exist
    const airlineFeeLabel = document.body.querySelector('label[for="mod-airline-fee"]');
    assert.ok(airlineFeeLabel, 'Label for mod-airline-fee must exist');

    const changeFeeLabel = document.body.querySelector('label[for="mod-change-fee"]');
    assert.ok(changeFeeLabel, 'Label for mod-change-fee must exist');

    // Verify flight dates inputs exist
    const depDateInput = document.body.querySelector('#mod-dep-date');
    const arrDateInput = document.body.querySelector('#mod-arr-date');
    assert.ok(depDateInput, '#mod-dep-date exists');
    assert.ok(arrDateInput, '#mod-arr-date exists');
    assert.strictEqual(depDateInput.value, '2026-10-15');
    assert.strictEqual(arrDateInput.value, '2026-10-15');
  });

  test('renderModificationsTab renders safely when originalFlight or newFlight are undefined (no route TypeError)', () => {
    // Ticket with modification where originalFlight and newFlight are undefined/missing
    const ticketWithRawMod = {
      ...mockTicket,
      modifications: [
        {
          id: 'MOD-1',
          title: 'Modification #1',
          changeFee: 500,
          date: '2026-10-10T12:00:00.000Z',
          reason: 'Schedule change'
          // originalFlight and newFlight are intentionally omitted/undefined
        }
      ]
    };

    let html = '';
    assert.doesNotThrow(() => {
      html = renderModificationsTab(ticketWithRawMod);
    }, 'renderModificationsTab must not throw when originalFlight is undefined');

    assert.ok(html.includes('tab-pane-modifications'), 'Tab pane is rendered');
    assert.ok(html.includes('CAI ✈ JED'), 'Falls back to ticket origin ✈ destination route');
    assert.ok(html.includes('MS 901'), 'Falls back to ticket flightNumber');
    assert.ok(html.includes('Schedule change'), 'Renders reason safely');
  });

  test('renderModificationsTab parses stringified JSON originalFlight and newFlight safely', () => {
    const ticketWithStringJsonMod = {
      ...mockTicket,
      modifications: [
        {
          id: 'MOD-2',
          title: 'Modification #2',
          changeFee: 1200,
          originalFlight: JSON.stringify({ route: 'Cairo ➔ Jeddah', flightNumber: 'MS 901', date: '2026-10-15' }),
          newFlight: JSON.stringify({ route: 'Cairo ➔ Riyadh', flightNumber: 'SV 302', date: '2026-10-18', note: '+3 Days' }),
          date: '2026-10-10T12:00:00.000Z',
          reason: 'Destination change'
        }
      ]
    };

    let html = '';
    assert.doesNotThrow(() => {
      html = renderModificationsTab(ticketWithStringJsonMod);
    });

    assert.ok(html.includes('Cairo ➔ Jeddah'), 'Parsed originalFlight route');
    assert.ok(html.includes('Cairo ➔ Riyadh'), 'Parsed newFlight route');
    assert.ok(html.includes('SV 302'), 'Parsed newFlight flightNumber');
    assert.ok(html.includes('+3 Days'), 'Parsed newFlight note');
  });
});

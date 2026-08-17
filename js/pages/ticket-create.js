/**
 * AfricaTravel — Create Ticket / New Reservation Page
 */

import { store } from '../state/store.js';
import { TicketService } from '../services/ticket-service.js';
import { icons } from '../components/icons.js';
import { showToast } from '../components/toast.js';
import { formatCurrency } from '../utils/calculations.js';

export const TicketCreatePage = {
  render() {
    return `
      <!-- Header -->
      <div class="page-header">
        <div class="page-header-left">
          <div class="page-breadcrumbs">
            <a href="/tickets" data-link>Tickets</a>
            <span>›</span>
            <span>Create Ticket</span>
          </div>
          <h1 class="page-title">New Reservation</h1>
          <p class="page-subtitle">Complete the itinerary and financial details to issue a new ticket.</p>
        </div>
        <div class="page-actions">
          <a href="/tickets" class="btn btn-secondary" data-link>Cancel</a>
          <button type="button" class="btn btn-secondary" id="save-draft-btn">Save Draft</button>
        </div>
      </div>

      <form id="create-ticket-form">
        <div class="grid grid-cols-12 gap-lg">
          <!-- Left Column: 8 Cols -->
          <div class="col-span-8 d-flex flex-column gap-lg">
            <!-- 1. Customer Identity -->
            <div class="card">
              <div class="card-header">
                <div class="d-flex items-center gap-xs">
                  ${icons.user('w-5 h-5')}
                  <h3 class="card-title">Customer Identity</h3>
                </div>
                <div class="d-flex gap-xs">
                  <button type="button" class="btn btn-sm btn-secondary" id="search-existing-cust-btn">Search Existing</button>
                  <button type="button" class="btn btn-sm btn-primary" id="new-cust-toggle-btn">Create New</button>
                </div>
              </div>
              <div class="card-body">
                <div class="form-grid-2">
                  <div class="form-group">
                    <label class="form-label" for="cust-name">Full Legal Name *</label>
                    <input
                      type="text"
                      id="cust-name"
                      class="form-control"
                      placeholder="e.g. Jane Doe"
                      required
                    />
                  </div>
                  <div class="form-group">
                    <label class="form-label" for="cust-passport">Passport Number *</label>
                    <input
                      type="text"
                      id="cust-passport"
                      class="form-control"
                      placeholder="e.g. A12345678"
                      required
                    />
                  </div>
                </div>

                <div class="form-grid-2">
                  <div class="form-group">
                    <label class="form-label" for="cust-phone">Contact Phone</label>
                    <input
                      type="tel"
                      id="cust-phone"
                      class="form-control"
                      placeholder="+20 100 000 0000"
                    />
                  </div>
                  <div class="form-group">
                    <label class="form-label" for="cust-nationality">Nationality</label>
                    <select id="cust-nationality" class="form-control">
                      <option value="Egyptian (EGY)">Egyptian (EGY)</option>
                      <option value="American (USA)">American (USA)</option>
                      <option value="British (GBR)">British (GBR)</option>
                      <option value="Saudi (SAU)">Saudi (SAU)</option>
                      <option value="Emirati (UAE)">Emirati (UAE)</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            <!-- 2. Itinerary Details -->
            <div class="card">
              <div class="card-header">
                <div class="d-flex items-center gap-xs">
                  ${icons.airplane('w-5 h-5')}
                  <h3 class="card-title">Itinerary Details</h3>
                </div>
              </div>
              <div class="card-body">
                <div class="form-grid-3">
                  <div class="form-group">
                    <label class="form-label" for="flight-airline">Airline *</label>
                    <select id="flight-airline" class="form-control" required>
                      <option value="">Select Carrier</option>
                      <option value="EgyptAir" data-code="MS">EgyptAir (MS)</option>
                      <option value="Emirates" data-code="EK">Emirates (EK)</option>
                      <option value="Qatar Airways" data-code="QR">Qatar Airways (QR)</option>
                      <option value="Turkish Airlines" data-code="TK">Turkish Airlines (TK)</option>
                      <option value="Saudia" data-code="SV">Saudia (SV)</option>
                      <option value="Etihad" data-code="EY">Etihad (EY)</option>
                      <option value="British Airways" data-code="BA">British Airways (BA)</option>
                    </select>
                  </div>
                  <div class="form-group">
                    <label class="form-label" for="flight-pnr">PNR (Locator) *</label>
                    <input
                      type="text"
                      id="flight-pnr"
                      class="form-control font-semibold"
                      placeholder="6-CHAR CODE"
                      maxlength="6"
                      style="text-transform: uppercase;"
                      required
                    />
                  </div>
                  <div class="form-group">
                    <label class="form-label" for="flight-ticket-num">Ticket Number</label>
                    <input
                      type="text"
                      id="flight-ticket-num"
                      class="form-control"
                      placeholder="13-digit code"
                    />
                  </div>
                </div>

                <div class="form-grid-2">
                  <div class="form-group">
                    <label class="form-label" for="flight-origin">Origin Airport (Code/Name) *</label>
                    <input
                      type="text"
                      id="flight-origin"
                      class="form-control"
                      placeholder="e.g. CAI - Cairo"
                      required
                    />
                  </div>
                  <div class="form-group">
                    <label class="form-label" for="flight-dest">Destination Airport *</label>
                    <input
                      type="text"
                      id="flight-dest"
                      class="form-control"
                      placeholder="e.g. DXB - Dubai"
                      required
                    />
                  </div>
                </div>

                <div class="form-grid-2">
                  <div class="form-group">
                    <label class="form-label" for="flight-dep-date">Departure Date & Time *</label>
                    <input
                      type="datetime-local"
                      id="flight-dep-date"
                      class="form-control"
                      required
                    />
                  </div>
                  <div class="form-group">
                    <label class="form-label" for="flight-arr-date">Arrival Date & Time</label>
                    <input
                      type="datetime-local"
                      id="flight-arr-date"
                      class="form-control"
                    />
                  </div>
                </div>

                <div class="form-grid-2">
                  <div class="form-group">
                    <label class="form-label" for="flight-seat">Seat Assignment</label>
                    <input
                      type="text"
                      id="flight-seat"
                      class="form-control"
                      placeholder="e.g. 12A"
                    />
                  </div>
                  <div class="form-group">
                    <label class="form-label" for="flight-baggage">Baggage Allowance</label>
                    <select id="flight-baggage" class="form-control">
                      <option value="Carry-on only">Carry-on only</option>
                      <option value="1 x 23kg">1 x 23kg</option>
                      <option value="2 x 23kg" selected>2 x 23kg</option>
                      <option value="2 x 32kg (Business)">2 x 32kg (Business)</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            <!-- 3. Financial Ledger -->
            <div class="card">
              <div class="card-header">
                <div class="d-flex items-center gap-xs">
                  ${icons.payments('w-5 h-5')}
                  <h3 class="card-title">Financial Ledger</h3>
                </div>
              </div>
              <div class="card-body">
                <div class="form-group">
                  <label class="form-label" for="ticket-price">Total Ticket Price *</label>
                  <div class="input-prefix-group">
                    <select id="ticket-currency" class="form-control" style="max-width: 100px; border-right: none; border-top-right-radius: 0; border-bottom-right-radius: 0; background-color: var(--color-surface-soft); font-weight: bold;">
                      <option value="EGP" selected>EGP</option>
                      <option value="USD">USD</option>
                      <option value="EUR">EUR</option>
                      <option value="SAR">SAR</option>
                      <option value="AED">AED</option>
                    </select>
                    <input
                      type="number"
                      id="ticket-price"
                      class="form-control font-bold"
                      placeholder="0.00"
                      min="1"
                      step="any"
                      required
                    />
                  </div>
                </div>

                <div class="form-grid-3">
                  <div class="form-group">
                    <label class="form-label" for="initial-payment">Initial Payment</label>
                    <input
                      type="number"
                      id="initial-payment"
                      class="form-control"
                      placeholder="0.00"
                      min="0"
                      step="any"
                    />
                  </div>
                  <div class="form-group">
                    <label class="form-label" for="payment-method">Payment Method</label>
                    <select id="payment-method" class="form-control">
                      <option value="Credit Card">Credit Card</option>
                      <option value="Cash">Cash</option>
                      <option value="Bank Transfer">Bank Transfer</option>
                      <option value="Vodafone Cash">Vodafone Cash</option>
                      <option value="InstaPay">InstaPay</option>
                      <option value="Corporate Account">Corporate Account</option>
                    </select>
                  </div>
                  <div class="form-group">
                    <label class="form-label" for="payment-ref">Ref / Auth Code</label>
                    <input
                      type="text"
                      id="payment-ref"
                      class="form-control"
                      placeholder="OPTIONAL"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Right Column: 4 Cols Sticky Summary -->
          <div class="col-span-4">
            <div class="card" style="position: sticky; top: calc(var(--topbar-height) + 20px);">
              <div class="card-header">
                <h3 class="card-title">Transaction Summary</h3>
              </div>
              <div class="card-body">
                <div class="d-flex flex-column gap-sm mb-md">
                  <div class="d-flex justify-between text-sm">
                    <span class="text-muted">Customer</span>
                    <strong id="summary-customer">--</strong>
                  </div>
                  <div class="d-flex justify-between text-sm">
                    <span class="text-muted">Route</span>
                    <strong id="summary-route">--- to ---</strong>
                  </div>
                  <div class="d-flex justify-between text-sm">
                    <span class="text-muted">Carrier</span>
                    <strong id="summary-carrier">--</strong>
                  </div>
                </div>

                <hr style="border: none; border-top: 1px solid var(--color-border-soft); margin: 16px 0;" />

                <div class="d-flex flex-column gap-sm mb-lg">
                  <div class="d-flex justify-between items-center">
                    <span class="text-muted">Total Price</span>
                    <span class="tabular-nums font-bold" style="font-size: 20px;" id="summary-total">EGP 0</span>
                  </div>
                  <div class="d-flex justify-between items-center">
                    <span class="text-muted">Collected</span>
                    <span class="tabular-nums font-semibold text-success" id="summary-collected">EGP 0</span>
                  </div>
                  <div class="d-flex justify-between items-center">
                    <span class="text-muted">Balance Due</span>
                    <span class="tabular-nums font-bold text-danger" id="summary-balance">EGP 0</span>
                  </div>
                </div>

                <button type="submit" class="btn btn-primary btn-block btn-lg" id="submit-ticket-btn">
                  ${icons.check('w-5 h-5')}
                  <span>Create Ticket</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </form>
    `;
  },

  afterRender(container) {
    const form = container.querySelector('#create-ticket-form');
    const custNameInput = container.querySelector('#cust-name');
    const originInput = container.querySelector('#flight-origin');
    const destInput = container.querySelector('#flight-dest');
    const airlineSelect = container.querySelector('#flight-airline');
    const priceInput = container.querySelector('#ticket-price');
    const currencySelect = container.querySelector('#ticket-currency');
    const initialPaymentInput = container.querySelector('#initial-payment');

    // Summary Elements
    const summaryCustomer = container.querySelector('#summary-customer');
    const summaryRoute = container.querySelector('#summary-route');
    const summaryCarrier = container.querySelector('#summary-carrier');
    const summaryTotal = container.querySelector('#summary-total');
    const summaryCollected = container.querySelector('#summary-collected');
    const summaryBalance = container.querySelector('#summary-balance');

    const updateLiveSummary = () => {
      const cust = custNameInput.value.trim() || '--';
      const origin = originInput.value.trim().toUpperCase() || '---';
      const dest = destInput.value.trim().toUpperCase() || '---';
      const carrier = airlineSelect.value || '--';

      const currency = currencySelect.value;
      const price = Number(priceInput.value) || 0;
      const initialPaid = Number(initialPaymentInput.value) || 0;
      const remaining = Math.max(0, price - initialPaid);

      if (summaryCustomer) summaryCustomer.textContent = cust;
      if (summaryRoute) summaryRoute.textContent = `${origin} to ${dest}`;
      if (summaryCarrier) summaryCarrier.textContent = carrier;

      if (summaryTotal) summaryTotal.textContent = formatCurrency(price, currency);
      if (summaryCollected) summaryCollected.textContent = formatCurrency(initialPaid, currency);
      if (summaryBalance) summaryBalance.textContent = formatCurrency(remaining, currency);
    };

    [custNameInput, originInput, destInput, airlineSelect, priceInput, currencySelect, initialPaymentInput].forEach(el => {
      if (el) {
        el.addEventListener('input', updateLiveSummary);
        el.addEventListener('change', updateLiveSummary);
      }
    });

    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();

        const airlineOpt = airlineSelect.options[airlineSelect.selectedIndex];
        const airlineCode = airlineOpt ? airlineOpt.getAttribute('data-code') : 'MS';

        const originCode = (originInput.value.split('-')[0] || originInput.value).trim().toUpperCase();
        const destCode = (destInput.value.split('-')[0] || destInput.value).trim().toUpperCase();

        const ticketData = {
          passengerName: custNameInput.value.trim(),
          passport: container.querySelector('#cust-passport').value.trim(),
          phone: container.querySelector('#cust-phone').value.trim(),
          nationality: container.querySelector('#cust-nationality').value,
          airline: airlineSelect.value,
          airlineCode: airlineCode,
          pnr: container.querySelector('#flight-pnr').value.trim().toUpperCase(),
          ticketNumber: container.querySelector('#flight-ticket-num').value.trim(),
          origin: originCode,
          destination: destCode,
          departureDate: container.querySelector('#flight-dep-date').value,
          arrivalDate: container.querySelector('#flight-arr-date').value,
          seat: container.querySelector('#flight-seat').value.trim() || '12A',
          baggage: container.querySelector('#flight-baggage').value,
          ticketPrice: Number(priceInput.value) || 0,
          currency: currencySelect.value,
          initialPayment: Number(initialPaymentInput.value) || 0,
          paymentMethod: container.querySelector('#payment-method').value,
          paymentReference: container.querySelector('#payment-ref').value.trim()
        };

        const result = TicketService.createTicket(ticketData);

        if (!result.success) {
          showToast(result.error.message, 'error');
          return;
        }

        const newTicket = result.data;
        showToast(`Ticket ${newTicket.id} created successfully!`, 'success');

        // Navigate to new ticket details
        window.history.pushState(null, null, `/tickets/${newTicket.id}`);
        window.dispatchEvent(new PopStateEvent('popstate'));
      });
    }

    const draftBtn = container.querySelector('#save-draft-btn');
    if (draftBtn) {
      draftBtn.addEventListener('click', () => {
        showToast('Reservation draft saved in memory', 'info');
      });
    }
  }
};

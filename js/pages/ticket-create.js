/**
 * AfricaTravel — Create Ticket / New Reservation Page
 */

import { store } from '../state/store.js';
import { TicketService } from '../services/ticket-service.js';
import { icons } from '../components/icons.js';
import { showToast } from '../components/toast.js';
import { formatCurrency } from '../utils/calculations.js';
import { escapeHtml } from '../utils/security.js';
import { t, i18n } from '../i18n/i18n.js';
import { renderAirlineOptionsHtml, findAirline } from '../data/airlines.js';

export const TicketCreatePage = {
  render() {
    return `
      <!-- Header -->
      <div class="page-header">
        <div class="page-header-left">
          <div class="page-breadcrumbs">
            <a href="/tickets" data-link>${escapeHtml(t('nav.tickets'))}</a>
            <span class="breadcrumb-separator">›</span>
            <span>${escapeHtml(t('ticketCreate.title'))}</span>
          </div>
          <h1 class="page-title">${escapeHtml(t('ticketCreate.title'))}</h1>
          <p class="page-subtitle">${escapeHtml(t('ticketCreate.subtitle'))}</p>
        </div>
        <div class="page-actions">
          <a href="/tickets" class="btn btn-secondary" data-link>${escapeHtml(t('common.cancel'))}</a>
        </div>
      </div>

      <form id="create-ticket-form">
        <div class="grid grid-cols-12 gap-lg">
          <!-- Left Column: 8 Cols -->
          <div class="col-span-8 d-flex flex-column gap-lg">
            <!-- AI Document Extraction Banner (Optional & Advisory) -->
            <div class="card" style="border: 1px dashed var(--color-primary); background: rgba(14, 116, 144, 0.04);">
              <div class="card-body d-flex items-center justify-between gap-md flex-wrap">
                <div class="d-flex items-center gap-md flex-wrap">
                  <input type="file" id="ai-extract-input" accept=".pdf,.jpg,.jpeg,.png" style="display:none;" />
                  <button type="button" class="btn btn-secondary" id="ai-extract-btn">
                    ${icons.upload ? icons.upload('w-4 h-4') : ''}
                    <span>${escapeHtml(t('ticketCreate.aiExtract.button') || 'استخراج البيانات من ملف (PDF/صورة)')}</span>
                  </button>
                  <span class="text-xs text-muted">${escapeHtml(t('ticketCreate.aiExtract.hint') || 'راجع البيانات المستخرجة قبل الحفظ — الاستخراج قد لا يكون دقيقًا 100%')}</span>
                </div>
              </div>
            </div>

            <!-- 1. Customer Identity -->
            <div class="card">
              <div class="card-header">
                <div class="d-flex items-center gap-xs">
                  ${icons.user('w-5 h-5')}
                  <h3 class="card-title">${escapeHtml(t('ticketCreate.passengerInfo.title'))}</h3>
                </div>
              </div>
              <div class="card-body">
                <div class="form-grid-2">
                  <div class="form-group">
                    <label class="form-label" for="cust-name">${escapeHtml(t('ticketCreate.passengerInfo.passengerName'))}</label>
                    <input
                      type="text"
                      id="cust-name"
                      class="form-control"
                      placeholder="${escapeHtml(t('ticketCreate.passengerInfo.passengerNamePlaceholder'))}"
                    />
                  </div>
                  <div class="form-group">
                    <label class="form-label" for="cust-passport">${escapeHtml(t('ticketCreate.passengerInfo.passport'))}</label>
                    <input
                      type="text"
                      id="cust-passport"
                      class="form-control ltr-field"
                      placeholder="${escapeHtml(t('ticketCreate.passengerInfo.passportPlaceholder'))}"
                    />
                  </div>
                </div>

                <div class="form-grid-2">
                  <div class="form-group">
                    <label class="form-label" for="cust-phone">${escapeHtml(t('ticketCreate.passengerInfo.phone'))}</label>
                    <input
                      type="tel"
                      id="cust-phone"
                      class="form-control ltr-field"
                      placeholder="${escapeHtml(t('ticketCreate.passengerInfo.phonePlaceholder'))}"
                    />
                  </div>
                  <div class="form-group">
                    <label class="form-label" for="cust-nationality">${escapeHtml(t('customerDetails.nationality'))}</label>
                    <select id="cust-nationality" class="form-control">
                      <option value="Egyptian (EGY)">Egyptian (مصر)</option>
                      <option value="Saudi (SAU)">Saudi (السعودية)</option>
                      <option value="Emirati (UAE)">Emirati (الإمارات)</option>
                      <option value="American (USA)">American (أمريكا)</option>
                      <option value="British (GBR)">British (بريطانيا)</option>
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
                  <h3 class="card-title">${escapeHtml(t('ticketCreate.flightInfo.title'))}</h3>
                </div>
              </div>
              <div class="card-body">
                <div class="form-grid-3">
                  <div class="form-group">
                    <label class="form-label" for="flight-airline">${escapeHtml(t('ticketCreate.flightInfo.airline'))}</label>
                    <select id="flight-airline" class="form-control">
                      <option value="">-- ${escapeHtml(t('ticketCreate.flightInfo.airline'))} --</option>
                      ${renderAirlineOptionsHtml('', i18n.getLanguage ? i18n.getLanguage() : 'ar')}
                    </select>
                  </div>
                  <div class="form-group">
                    <label class="form-label" for="flight-number">${escapeHtml(t('ticketCreate.flightInfo.flightNumber'))}</label>
                    <input
                      type="text"
                      id="flight-number"
                      class="form-control ltr-field"
                      placeholder="e.g. MS 986"
                    />
                  </div>
                  <div class="form-group">
                    <label class="form-label" for="flight-pnr">${escapeHtml(t('ticketCreate.flightInfo.pnr'))}</label>
                    <input
                      type="text"
                      id="flight-pnr"
                      class="form-control font-semibold ltr-field"
                      placeholder="${escapeHtml(t('ticketCreate.flightInfo.pnrPlaceholder'))}"
                      maxlength="10"
                      style="text-transform: uppercase;"
                    />
                  </div>
                </div>

                <div class="form-grid-3">
                  <div class="form-group">
                    <label class="form-label" for="flight-ticket-num">${escapeHtml(t('ticketCreate.flightInfo.ticketNumber'))}</label>
                    <input
                      type="text"
                      id="flight-ticket-num"
                      class="form-control ltr-field"
                      placeholder="${escapeHtml(t('ticketCreate.flightInfo.ticketNumberPlaceholder'))}"
                    />
                  </div>
                  <div class="form-group">
                    <label class="form-label" for="flight-origin">${escapeHtml(t('ticketCreate.flightInfo.origin'))}</label>
                    <input
                      type="text"
                      id="flight-origin"
                      class="form-control ltr-field"
                      placeholder="CAI - Cairo"
                    />
                  </div>
                  <div class="form-group">
                    <label class="form-label" for="flight-dest">${escapeHtml(t('ticketCreate.flightInfo.destination'))}</label>
                    <input
                      type="text"
                      id="flight-dest"
                      class="form-control ltr-field"
                      placeholder="DXB - Dubai"
                    />
                  </div>
                </div>

                <div class="form-group mb-md">
                  <label class="form-label" for="flight-dep-date">${escapeHtml(t('ticketCreate.flightInfo.departureDate'))}</label>
                  <input
                    type="date"
                    id="flight-dep-date"
                    class="form-control"
                  />
                </div>

                <div class="form-group">
                  <label class="form-label" for="flight-baggage">Baggage Allowance</label>
                  <select id="flight-baggage" class="form-control">
                    <option value="2x 23kg Checked">2x 23kg Checked</option>
                    <option value="1x 23kg Checked">1x 23kg Checked</option>
                    <option value="2x 32kg Business">2x 32kg Business</option>
                    <option value="Hand Luggage Only (7kg)">Hand Luggage Only (7kg)</option>
                  </select>
                </div>
              </div>
            </div>

            <!-- Return Flight Section (Always Visible & Optional) -->
            <div class="card">
              <div class="card-header">
                <div class="d-flex items-center gap-xs">
                  ${icons.airplane('w-5 h-5')}
                  <h3 class="card-title">${escapeHtml(t('ticketCreate.returnFlight.title'))}</h3>
                </div>
              </div>
              <div class="card-body">
                <p class="text-xs text-muted" style="margin: 0 0 12px;">
                  ${escapeHtml(t('ticketCreate.returnFlight.optionalHint') || 'اتركها فارغة لتذكرة ذهاب فقط')}
                </p>
                <div class="form-grid-2">
                  <div class="form-group">
                    <label class="form-label" for="return-flight-number">${escapeHtml(t('ticketCreate.returnFlight.flightNumber'))}</label>
                    <input type="text" id="return-flight-number" class="form-control ltr-field" placeholder="e.g. MS 987" />
                  </div>
                  <div class="form-group">
                    <label class="form-label" for="return-dep-date">${escapeHtml(t('ticketCreate.returnFlight.departureDate'))}</label>
                    <input type="date" id="return-dep-date" class="form-control" />
                  </div>
                </div>
              </div>
            </div>

            <!-- 3. Financials & Payment -->
            <div class="card">
              <div class="card-header">
                <div class="d-flex items-center gap-xs">
                  ${icons.payments('w-5 h-5')}
                  <h3 class="card-title">${escapeHtml(t('ticketCreate.financials.title'))}</h3>
                </div>
              </div>
              <div class="card-body">
                <div class="form-grid-3">
                  <div class="form-group">
                    <label class="form-label" for="ticket-price">${escapeHtml(t('ticketCreate.financials.ticketPrice'))}</label>
                    <input
                      type="number"
                      id="ticket-price"
                      class="form-control tabular-nums"
                      placeholder="0.00"
                      min="0"
                      step="any"
                    />
                  </div>
                  <div class="form-group">
                    <label class="form-label" for="ticket-cost-price">${escapeHtml(t('ticketCreate.financials.costPrice'))}</label>
                    <input
                      type="number"
                      id="ticket-cost-price"
                      class="form-control tabular-nums"
                      placeholder="0.00"
                      min="0"
                      step="any"
                    />
                  </div>
                  <div class="form-group">
                    <label class="form-label" for="ticket-currency">Currency</label>
                    <select id="ticket-currency" class="form-control">
                      <option value="EGP" selected>EGP (جنيه مصري)</option>
                      <option value="USD">USD ($)</option>
                      <option value="EUR">EUR (€)</option>
                      <option value="SAR">SAR (ريال)</option>
                      <option value="AED">AED (درهم)</option>
                    </select>
                  </div>
                </div>

                <div class="form-grid-3">
                  <div class="form-group">
                    <label class="form-label" for="initial-payment">${escapeHtml(t('ticketCreate.financials.initialPayment'))}</label>
                    <input
                      type="number"
                      id="initial-payment"
                      class="form-control tabular-nums"
                      placeholder="0.00"
                      min="0"
                      step="any"
                      value="0"
                    />
                  </div>
                  <div class="form-group">
                    <label class="form-label" for="payment-method">${escapeHtml(t('ticketCreate.financials.paymentMethod'))}</label>
                    <select id="payment-method" class="form-control">
                      <option value="Cash">Cash (نقدًا)</option>
                      <option value="Credit Card">Credit Card (بطاقة ائتمان)</option>
                      <option value="Bank Transfer">Bank Transfer (تحويل بنكي)</option>
                      <option value="Vodafone Cash">Vodafone Cash (فودافون كاش)</option>
                      <option value="InstaPay">InstaPay (إنستاباي)</option>
                      <option value="Corporate Account">Corporate Account (حساب شركات)</option>
                    </select>
                  </div>
                  <div class="form-group">
                    <label class="form-label" for="payment-ref">${escapeHtml(t('ticketCreate.financials.paymentRef'))}</label>
                    <input
                      type="text"
                      id="payment-ref"
                      class="form-control ltr-field"
                      placeholder="${escapeHtml(t('ticketCreate.financials.paymentRefPlaceholder'))}"
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
                <h3 class="card-title">${escapeHtml(t('ticketDetails.overview.financialSummary'))}</h3>
              </div>
              <div class="card-body">
                <div class="d-flex flex-column gap-sm mb-md">
                  <div class="d-flex justify-between text-sm">
                    <span class="text-muted">${escapeHtml(t('tickets.table.passenger'))}</span>
                    <strong id="summary-customer">--</strong>
                  </div>
                  <div class="d-flex justify-between text-sm">
                    <span class="text-muted">${escapeHtml(t('tickets.table.route'))}</span>
                    <strong id="summary-route" class="ltr-data">--- ✈ ---</strong>
                  </div>
                  <div class="d-flex justify-between text-sm">
                    <span class="text-muted">${escapeHtml(t('tickets.table.airline'))}</span>
                    <strong id="summary-carrier">--</strong>
                  </div>
                </div>

                <hr style="border: none; border-top: 1px solid var(--color-border-soft); margin: 16px 0;" />

                <div class="d-flex flex-column gap-sm mb-lg">
                  <div class="d-flex justify-between items-center">
                    <span class="text-muted">${escapeHtml(t('ticketCreate.financials.ticketPrice'))}</span>
                    <span class="tabular-nums font-bold" style="font-size: 20px;" id="summary-total">0</span>
                  </div>
                  <div class="d-flex justify-between items-center">
                    <span class="text-muted">${escapeHtml(t('common.paid'))}</span>
                    <span class="tabular-nums font-semibold text-success" id="summary-collected">0</span>
                  </div>
                  <div class="d-flex justify-between items-center">
                    <span class="text-muted">${escapeHtml(t('common.remaining'))}</span>
                    <span class="tabular-nums font-bold text-danger" id="summary-balance">0</span>
                  </div>
                </div>

                <button type="submit" class="btn btn-primary btn-block btn-lg" id="submit-ticket-btn">
                  ${icons.check('w-5 h-5')}
                  <span>${escapeHtml(t('ticketCreate.buttons.submit'))}</span>
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
      if (summaryRoute) summaryRoute.textContent = `${origin} ✈ ${dest}`;
      if (summaryCarrier) summaryCarrier.textContent = carrier;

      if (summaryTotal) summaryTotal.textContent = formatCurrency(price, currency);
      if (summaryCollected) summaryCollected.textContent = formatCurrency(initialPaid, currency);
      if (summaryBalance) summaryBalance.textContent = formatCurrency(remaining, currency);
    };

    const flightNumInput = container.querySelector('#flight-number');
    const returnFlightNumInput = container.querySelector('#return-flight-number');

    if (airlineSelect) {
      airlineSelect.addEventListener('change', () => {
        const selectedOpt = airlineSelect.options[airlineSelect.selectedIndex];
        const code = selectedOpt ? selectedOpt.getAttribute('data-code') : '';
        if (code && flightNumInput) {
          flightNumInput.placeholder = `e.g. ${code} 101`;
        }
        if (code && returnFlightNumInput) {
          returnFlightNumInput.placeholder = `e.g. ${code} 102`;
        }
      });
    }

    [custNameInput, originInput, destInput, airlineSelect, priceInput, currencySelect, initialPaymentInput].forEach(el => {
      if (el) {
        el.addEventListener('input', updateLiveSummary);
        el.addEventListener('change', updateLiveSummary);
      }
    });

    // AI Document Extraction Event Handling
    const aiExtractBtn = container.querySelector('#ai-extract-btn');
    const aiExtractInput = container.querySelector('#ai-extract-input');

    if (aiExtractBtn && aiExtractInput) {
      aiExtractBtn.addEventListener('click', () => aiExtractInput.click());

      aiExtractInput.addEventListener('change', async () => {
        const file = aiExtractInput.files?.[0];
        if (!file) return;

        aiExtractBtn.disabled = true;
        const originalBtnHtml = aiExtractBtn.innerHTML;
        aiExtractBtn.innerHTML = `<span class="spinner-sm" style="display:inline-block;width:14px;height:14px;border:2px solid currentColor;border-right-color:transparent;border-radius:50%;animation:rotate 0.75s linear infinite;vertical-align:middle;margin-right:6px;"></span> <span>${escapeHtml(t('ticketCreate.aiExtract.loading') || 'جاري الاستخراج...')}</span>`;

        try {
          const result = await TicketService.extractFromDocument(file);

          if (!result.success) {
            showToast(result.error?.message || 'فشل الاستخراج، أكمل البيانات يدويًا', 'error');
            return;
          }

          const d = result.data || {};
          const setVal = (id, val) => {
            const el = container.querySelector(`#${id}`);
            if (el && val !== undefined && val !== null && String(val).trim() !== '') {
              el.value = val;
            }
          };

          if (d.passengerName) setVal('cust-name', d.passengerName);
          if (d.passport) setVal('cust-passport', d.passport);
          if (d.phone) setVal('cust-phone', d.phone);
          if (d.nationality) {
            const natEl = container.querySelector('#cust-nationality');
            if (natEl) {
              const query = String(d.nationality).toLowerCase();
              const matchedOpt = Array.from(natEl.options).find(o =>
                o.value.toLowerCase().includes(query) || o.text.toLowerCase().includes(query)
              );
              if (matchedOpt) natEl.value = matchedOpt.value;
            }
          }

          // Airline matching (using master airlines registry and fallback)
          if (d.airline || d.airlineCode) {
            const airSelect = container.querySelector('#flight-airline');
            if (airSelect) {
              const matched = findAirline(d.airlineCode || d.airline) || findAirline(d.airline);
              if (matched) {
                airSelect.value = matched.name;
                if (flightNumInput) flightNumInput.placeholder = `e.g. ${matched.code} 101`;
              } else {
                const airlineQuery = (d.airline || '').toLowerCase();
                const codeQuery = (d.airlineCode || '').toLowerCase();
                const matchedOpt = Array.from(airSelect.options).find(o =>
                  (airlineQuery && o.value.toLowerCase().includes(airlineQuery)) ||
                  (codeQuery && o.getAttribute('data-code')?.toLowerCase() === codeQuery)
                );
                if (matchedOpt) airSelect.value = matchedOpt.value;
              }
            }
          }

          if (d.flightNumber) setVal('flight-number', d.flightNumber);
          if (d.pnr) setVal('flight-pnr', d.pnr);
          if (d.ticketNumber) setVal('flight-ticket-num', d.ticketNumber);
          if (d.origin) setVal('flight-origin', d.origin);
          if (d.destination) setVal('flight-dest', d.destination);
          if (d.departureDate) setVal('flight-dep-date', d.departureDate);

          // Return flight details
          if (d.returnFlightNumber) setVal('return-flight-number', d.returnFlightNumber);
          if (d.returnDepartureDate) setVal('return-dep-date', d.returnDepartureDate);

          // Pricing (costPrice is deliberately NOT set from AI extraction)
          if (d.ticketPrice !== undefined && d.ticketPrice !== null && !isNaN(Number(d.ticketPrice))) {
            setVal('ticket-price', d.ticketPrice);
          }
          if (d.currency) {
            const currSelect = container.querySelector('#ticket-currency');
            if (currSelect) {
              const matchedCurr = Array.from(currSelect.options).find(o => o.value.toUpperCase() === String(d.currency).toUpperCase());
              if (matchedCurr) currSelect.value = matchedCurr.value;
            }
          }

          updateLiveSummary();
          showToast(t('ticketCreate.aiExtract.success') || 'تم الاستخراج بنجاح — يرجى مراجعة البيانات قبل الحفظ', 'success');
        } finally {
          aiExtractBtn.disabled = false;
          aiExtractBtn.innerHTML = originalBtnHtml;
          aiExtractInput.value = '';
        }
      });
    }

    if (form) {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const airlineOpt = airlineSelect.options[airlineSelect.selectedIndex];
        const airlineCode = airlineOpt ? airlineOpt.getAttribute('data-code') : 'MS';

        const originCode = (originInput.value.split('-')[0] || originInput.value).trim().toUpperCase();
        const destCode = (destInput.value.split('-')[0] || destInput.value).trim().toUpperCase();

        const flightNumberInput = container.querySelector('#flight-number');
        const flightNumber = flightNumberInput ? flightNumberInput.value.trim().toUpperCase() : '';

        const returnDepDateInput = container.querySelector('#return-dep-date');
        const returnFlightNumberInput = container.querySelector('#return-flight-number');

        const returnDepDate = returnDepDateInput ? returnDepDateInput.value : '';
        const returnFlightNumber = returnFlightNumberInput ? returnFlightNumberInput.value.trim() : '';

        // النوع بيتحدد تلقائيًا حسب امتلاء تاريخ العودة
        const isRoundTrip = Boolean(returnDepDate);
        const tripTypeValue = isRoundTrip ? 'Round Trip' : 'One Way';

        const departureDateValue = container.querySelector('#flight-dep-date').value;

        // تحقق مرن: العودة لازم تكون بعد الذهاب بس، من غير أي قيد على السنة
        if (isRoundTrip && departureDateValue && new Date(returnDepDate) <= new Date(departureDateValue)) {
          showToast(t('validation.returnDateAfterDeparture') || 'تاريخ العودة يجب أن يكون بعد تاريخ الذهاب', 'error');
          if (returnDepDateInput) returnDepDateInput.focus();
          return;
        }

        const ticketData = {
          passengerName: custNameInput.value.trim(),
          passport: container.querySelector('#cust-passport').value.trim(),
          phone: container.querySelector('#cust-phone').value.trim(),
          nationality: container.querySelector('#cust-nationality').value,
          airline: airlineSelect.value,
          airlineCode: airlineCode,
          flightNumber: flightNumber,
          tripType: tripTypeValue,
          returnFlightNumber: isRoundTrip && returnFlightNumber ? returnFlightNumber.toUpperCase() : undefined,
          returnDepartureDate: isRoundTrip ? returnDepDate : undefined,
          pnr: container.querySelector('#flight-pnr').value.trim().toUpperCase(),
          ticketNumber: container.querySelector('#flight-ticket-num').value.trim(),
          origin: originCode,
          destination: destCode,
          departureDate: container.querySelector('#flight-dep-date').value,
          baggage: container.querySelector('#flight-baggage').value,
          ticketPrice: Number(priceInput.value) || 0,
          costPrice: Number(container.querySelector('#ticket-cost-price')?.value) || 0,
          currency: currencySelect.value,
          initialPayment: Number(initialPaymentInput.value) || 0,
          paymentMethod: container.querySelector('#payment-method').value,
          paymentReference: container.querySelector('#payment-ref').value.trim()
        };

        const submitBtn = form.querySelector('button[type="submit"]');
        if (submitBtn) submitBtn.disabled = true;

        const result = await TicketService.createTicket(ticketData);
        if (submitBtn) submitBtn.disabled = false;

        if (!result.success) {
          showToast(result.error?.message || 'Failed to create ticket', 'error');
          return;
        }

        const newTicket = result.data;
        showToast(t('toasts.ticketCreated'), 'success');

        // Navigate to new ticket details
        window.history.pushState(null, null, `/tickets/${newTicket.id}`);
        window.dispatchEvent(new PopStateEvent('popstate'));
      });
    }
  }
};

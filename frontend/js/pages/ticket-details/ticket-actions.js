/**
 * AfricaTravel — Ticket Action Modals (Payment, Modification, Refund, Edit)
 */

import { TicketService } from '../../services/ticket-service.js';
import { AuthService } from '../../services/auth-service.js';
import { openModal, closeModal } from '../../components/modal.js';
import { showToast } from '../../components/toast.js';
import { formatCurrency } from '../../utils/calculations.js';
import { escapeHtml } from '../../utils/security.js';
import { t, i18n } from '../../i18n/i18n.js';

export function openAddPaymentModal(ticket, onSuccess) {
  const financials = TicketService.getTicketFinancials(ticket);
  const modOutstanding = financials.modificationOutstanding || 0;
  const hasModOutstanding = modOutstanding > 0;
  const remaining = financials.remaining || 0;
  const defaultType = remaining > 0 ? 'TICKET' : (hasModOutstanding ? 'MODIFICATION' : 'TICKET');
  const initialMax = defaultType === 'TICKET' ? remaining : modOutstanding;
  const initialVal = defaultType === 'TICKET' ? (remaining > 0 ? remaining : '') : (modOutstanding > 0 ? modOutstanding : '');

  openModal({
    title: `${t('modals.addPayment.title')} #${ticket.id}`,
    subtitle: `${t('modals.addPayment.remainingIs')} ${formatCurrency(financials.remaining, financials.currency)}`,
    contentHtml: `
      <form id="record-payment-form" class="d-flex flex-column gap-md">
        ${hasModOutstanding ? `
        <div class="form-group">
          <label class="form-label" for="pay-type">${escapeHtml(t('modals.addPayment.type'))} *</label>
          <select id="pay-type" class="form-control" required>
            <option value="TICKET" ${defaultType === 'TICKET' ? 'selected' : ''}>${escapeHtml(t('modals.addPayment.typeTicket'))}</option>
            <option value="MODIFICATION" ${defaultType === 'MODIFICATION' ? 'selected' : ''}>${escapeHtml(t('modals.addPayment.typeModification'))} (${formatCurrency(modOutstanding, financials.currency)})</option>
          </select>
        </div>
        ` : ''}

        <div class="form-grid-2">
          <div class="form-group">
            <label class="form-label" for="pay-amount">${escapeHtml(t('modals.addPayment.amount'))} *</label>
            <input
              type="number"
              id="pay-amount"
              class="form-control tabular-nums"
              placeholder="0.00"
              value="${initialVal}"
              max="${initialMax}"
              min="0.01"
              step="0.01"
              required
            />
            <span class="text-xs text-muted mt-xxs" id="pay-amount-hint">
              ${defaultType === 'TICKET'
                ? `${escapeHtml(t('modals.addPayment.remainingIs'))} ${formatCurrency(remaining, financials.currency)}`
                : `${escapeHtml(t('modals.addPayment.modificationOutstandingIs'))} ${formatCurrency(modOutstanding, financials.currency)}`}
            </span>
          </div>

          <div class="form-group">
            <label class="form-label" for="pay-method">${escapeHtml(t('modals.addPayment.method'))} *</label>
            <select id="pay-method" class="form-control" required>
              <option value="Cash">Cash (نقدًا)</option>
              <option value="Credit Card">Credit Card (بطاقة ائتمان)</option>
              <option value="Bank Transfer">Bank Transfer (تحويل بنكي)</option>
              <option value="Vodafone Cash">Vodafone Cash (فودافون كاش)</option>
              <option value="InstaPay">InstaPay (إنستاباي)</option>
              <option value="Corporate Credit">Corporate Credit (حساب شركات)</option>
            </select>
          </div>
        </div>

        <div class="form-grid-2">
          <div class="form-group">
            <label class="form-label" for="pay-date">${escapeHtml(t('common.date'))} *</label>
            <input type="datetime-local" id="pay-date" class="form-control" value="${new Date().toISOString().slice(0, 16)}" required />
          </div>

          <div class="form-group">
            <label class="form-label" for="pay-ref">${escapeHtml(t('modals.addPayment.ref'))}</label>
            <input type="text" id="pay-ref" class="form-control ltr-field" placeholder="${escapeHtml(t('modals.addPayment.refPlaceholder'))}" value="REF-${Math.floor(100000 + Math.random() * 900000)}" />
          </div>
        </div>

        <div class="form-group">
          <label class="form-label" for="pay-notes">${escapeHtml(t('modals.addPayment.notes'))}</label>
          <textarea id="pay-notes" class="form-control" placeholder="..."></textarea>
        </div>
      </form>
    `,
    footerHtml: `
      <button type="button" class="btn btn-secondary" id="modal-cancel-pay">${escapeHtml(t('common.cancel'))}</button>
      <button type="button" class="btn btn-primary" id="modal-submit-pay">${escapeHtml(t('modals.addPayment.submit'))}</button>
    `,
    onOpen: (modalEl) => {
      const cancelBtn = modalEl.querySelector('#modal-cancel-pay');
      const submitBtn = modalEl.querySelector('#modal-submit-pay');
      const payTypeSelect = modalEl.querySelector('#pay-type');
      const amountInput = modalEl.querySelector('#pay-amount');
      const amountHint = modalEl.querySelector('#pay-amount-hint');

      if (payTypeSelect) {
        payTypeSelect.addEventListener('change', () => {
          const selected = payTypeSelect.value;
          if (selected === 'MODIFICATION') {
            amountInput.max = modOutstanding;
            amountInput.value = modOutstanding > 0 ? modOutstanding : '';
            if (amountHint) {
              amountHint.textContent = `${t('modals.addPayment.modificationOutstandingIs')} ${formatCurrency(modOutstanding, financials.currency)}`;
            }
          } else {
            amountInput.max = remaining;
            amountInput.value = remaining > 0 ? remaining : '';
            if (amountHint) {
              amountHint.textContent = `${t('modals.addPayment.remainingIs')} ${formatCurrency(remaining, financials.currency)}`;
            }
          }
        });
      }

      if (cancelBtn) cancelBtn.addEventListener('click', closeModal);

      if (submitBtn) {
        submitBtn.addEventListener('click', async () => {
          const amount = Number(modalEl.querySelector('#pay-amount').value);
          const paymentType = payTypeSelect ? payTypeSelect.value : 'TICKET';
          const method = modalEl.querySelector('#pay-method').value;
          const date = modalEl.querySelector('#pay-date').value;
          const reference = modalEl.querySelector('#pay-ref').value.trim();
          const notes = modalEl.querySelector('#pay-notes').value.trim();

          submitBtn.disabled = true;
          const result = await TicketService.addPayment(ticket.id, {
            amount,
            type: paymentType,
            method,
            date,
            reference,
            notes,
            currency: ticket.currency
          });
          submitBtn.disabled = false;

          if (!result.success) {
            showToast(result.error.message, 'error');
            return;
          }

          closeModal();
          showToast(t('toasts.paymentAdded'), 'success');
          if (onSuccess) onSuccess();
        });
      }
    }
  });
}

export function openModifyFlightModal(ticket, onSuccess) {
  const isRoundTrip = ticket.tripType === 'Round Trip' || Boolean(ticket.returnDepartureDate || ticket.returnFlightNumber);

  openModal({
    title: `${t('modals.modifyFlight.title')} #${ticket.id}`,
    subtitle: isRoundTrip
      ? `${ticket.origin} ⇄ ${ticket.destination} (${ticket.flightNumber || 'MS 901'}${ticket.returnFlightNumber ? ` / ${ticket.returnFlightNumber}` : ''})`
      : `${ticket.origin} ✈ ${ticket.destination} (${ticket.flightNumber || 'MS 901'})`,
    contentHtml: (() => {
      const depDateVal = ticket.departureDate ? (typeof ticket.departureDate === 'string' ? ticket.departureDate.slice(0, 10) : new Date(ticket.departureDate).toISOString().slice(0, 10)) : '';
      const arrDateVal = ticket.arrivalDate ? (typeof ticket.arrivalDate === 'string' ? ticket.arrivalDate.slice(0, 10) : new Date(ticket.arrivalDate).toISOString().slice(0, 10)) : '';
      const retDepDateVal = ticket.returnDepartureDate ? (typeof ticket.returnDepartureDate === 'string' ? ticket.returnDepartureDate.slice(0, 10) : new Date(ticket.returnDepartureDate).toISOString().slice(0, 10)) : '';
      const retArrDateVal = ticket.returnArrivalDate ? (typeof ticket.returnArrivalDate === 'string' ? ticket.returnArrivalDate.slice(0, 10) : new Date(ticket.returnArrivalDate).toISOString().slice(0, 10)) : '';

      return `
      <form id="modify-flight-form" class="d-flex flex-column gap-md">
        <!-- Outbound Section -->
        <div class="card p-sm bg-surface-raised border">
          <div class="font-bold text-sm mb-xs text-primary">${escapeHtml(t('modals.modifyFlight.outboundSection'))}</div>
          <div class="form-group mb-xs">
            <label class="form-label" for="mod-flight-num">${escapeHtml(t('modals.modifyFlight.newFlightNumber'))}</label>
            <input type="text" id="mod-flight-num" class="form-control ltr-field" value="${escapeHtml(ticket.flightNumber || '')}" />
          </div>
          <div class="form-grid-2">
            <div class="form-group">
              <label class="form-label" for="mod-dep-date">${escapeHtml(t('modals.modifyFlight.newDeparture'))}</label>
              <input type="date" id="mod-dep-date" class="form-control" value="${depDateVal}" />
            </div>
            <div class="form-group">
              <label class="form-label" for="mod-arr-date">${escapeHtml(t('modals.modifyFlight.newArrival'))}</label>
              <input type="date" id="mod-arr-date" class="form-control" value="${arrDateVal}" />
            </div>
          </div>
        </div>

        <!-- Return Section (if Round Trip) -->
        ${isRoundTrip ? `
        <div class="card p-sm bg-surface-raised border">
          <div class="font-bold text-sm mb-xs text-primary">${escapeHtml(t('modals.modifyFlight.returnSection'))}</div>
          <div class="form-group mb-xs">
            <label class="form-label" for="mod-return-flight-num">${escapeHtml(t('modals.modifyFlight.newReturnFlightNumber'))}</label>
            <input type="text" id="mod-return-flight-num" class="form-control ltr-field" value="${escapeHtml(ticket.returnFlightNumber || '')}" />
          </div>
          <div class="form-grid-2">
            <div class="form-group">
              <label class="form-label" for="mod-return-dep-date">${escapeHtml(t('modals.modifyFlight.newReturnDeparture'))}</label>
              <input type="date" id="mod-return-dep-date" class="form-control" value="${retDepDateVal}" />
            </div>
            <div class="form-group">
              <label class="form-label" for="mod-return-arr-date">${escapeHtml(t('modals.modifyFlight.newReturnArrival'))}</label>
              <input type="date" id="mod-return-arr-date" class="form-control" value="${retArrDateVal}" />
            </div>
          </div>
        </div>
        ` : ''}

        <!-- Fees Section -->
        <div class="form-grid-2">
          <div class="form-group">
            <label class="form-label" for="mod-airline-fee">${escapeHtml(t('modals.modifyFlight.modFeeAirline'))}</label>
            <input type="number" id="mod-airline-fee" class="form-control tabular-nums" value="0" min="0" />
          </div>

          <div class="form-group">
            <label class="form-label" for="mod-change-fee">${escapeHtml(t('modals.modifyFlight.modFeeCustomer'))}</label>
            <input type="number" id="mod-change-fee" class="form-control tabular-nums" value="1200" min="0" />
          </div>
        </div>

        <!-- Quick Fee Collection Option -->
        <div class="card p-xs bg-surface-raised border">
          <label class="d-flex items-center gap-xs cursor-pointer mb-0">
            <input type="checkbox" id="mod-collected-now" checked />
            <span class="font-medium text-sm">${escapeHtml(t('modals.modifyFlight.collectedNow'))}</span>
          </label>
          <div class="form-group mt-xs" id="mod-payment-method-group">
            <label class="form-label text-xs" for="mod-payment-method">${escapeHtml(t('modals.modifyFlight.paymentMethod'))}</label>
            <select id="mod-payment-method" class="form-control">
              <option value="Cash">Cash (نقداً)</option>
              <option value="Credit Card">Credit Card (بطاقة دفع)</option>
              <option value="Bank Transfer">Bank Transfer (تحويل بنكي)</option>
              <option value="InstaPay">InstaPay (إنستاباي)</option>
              <option value="Vodafone Cash">Vodafone Cash (فودافون كاش)</option>
            </select>
          </div>
        </div>

        <div class="form-group">
          <label class="form-label" for="mod-reason">${escapeHtml(t('modals.modifyFlight.reason'))} *</label>
          <select id="mod-reason" class="form-control" required>
            <option value="Passenger Request">Passenger Request</option>
            <option value="Airline Reschedule">Airline Reschedule</option>
            <option value="Flight Cancellation">Flight Cancellation</option>
            <option value="Operational Change">Operational Change</option>
          </select>
        </div>

        <div class="form-group">
          <label class="form-label" for="mod-note">${escapeHtml(t('common.notes'))}</label>
          <input type="text" id="mod-note" class="form-control" placeholder="..." />
        </div>
      </form>
    `;
    })(),
    footerHtml: `
      <button type="button" class="btn btn-secondary" id="modal-cancel-mod">${escapeHtml(t('common.cancel'))}</button>
      <button type="button" class="btn btn-primary" id="modal-submit-mod">${escapeHtml(t('modals.modifyFlight.submit'))}</button>
    `,
    onOpen: (modalEl) => {
      const cancelBtn = modalEl.querySelector('#modal-cancel-mod');
      const submitBtn = modalEl.querySelector('#modal-submit-mod');
      const collectedNowCheckbox = modalEl.querySelector('#mod-collected-now');
      const paymentGroup = modalEl.querySelector('#mod-payment-method-group');

      if (collectedNowCheckbox && paymentGroup) {
        collectedNowCheckbox.addEventListener('change', () => {
          paymentGroup.style.display = collectedNowCheckbox.checked ? 'block' : 'none';
        });
      }

      if (cancelBtn) cancelBtn.addEventListener('click', closeModal);

      if (submitBtn) {
        submitBtn.addEventListener('click', async () => {
          const flightNumber = (modalEl.querySelector('#mod-flight-num')?.value || '').trim();
          const returnFlightInput = modalEl.querySelector('#mod-return-flight-num');
          const returnFlightNumber = returnFlightInput ? returnFlightInput.value.trim() : undefined;

          const airlineFee = Number(modalEl.querySelector('#mod-airline-fee').value) || 0;
          const changeFee = Number(modalEl.querySelector('#mod-change-fee').value) || 0;
          const newDepartureDate = modalEl.querySelector('#mod-dep-date')?.value || '';
          const newArrivalDate = modalEl.querySelector('#mod-arr-date')?.value || '';

          const retDepInput = modalEl.querySelector('#mod-return-dep-date');
          const retArrInput = modalEl.querySelector('#mod-return-arr-date');
          const newReturnDepartureDate = retDepInput ? retDepInput.value : undefined;
          const newReturnArrivalDate = retArrInput ? retArrInput.value : undefined;

          const collectedNow = collectedNowCheckbox ? collectedNowCheckbox.checked : false;
          const paymentMethod = modalEl.querySelector('#mod-payment-method')?.value || 'Cash';

          const reason = modalEl.querySelector('#mod-reason').value;
          const note = modalEl.querySelector('#mod-note').value.trim();

          submitBtn.disabled = true;
          const payload = {
            flightNumber,
            changeFee,
            airlineFee,
            collectedNow,
            paymentMethod,
            reason,
            note,
            currency: ticket.currency
          };
          if (newDepartureDate) payload.newDepartureDate = newDepartureDate;
          if (newArrivalDate) payload.newArrivalDate = newArrivalDate;
          if (returnFlightNumber) payload.returnFlightNumber = returnFlightNumber;
          if (newReturnDepartureDate) payload.newReturnDepartureDate = newReturnDepartureDate;
          if (newReturnArrivalDate) payload.newReturnArrivalDate = newReturnArrivalDate;

          const result = await TicketService.addModification(ticket.id, payload);
          submitBtn.disabled = false;

          if (!result.success) {
            showToast(result.error.message, 'error');
            return;
          }

          closeModal();
          showToast(t('toasts.flightModified'), 'success');
          if (onSuccess) onSuccess();
        });
      }
    }
  });
}

export function openAddRefundModal(ticket, onSuccess) {
  const financials = TicketService.getTicketFinancials(ticket);
  const costPriceVal = ticket.costPrice !== null && ticket.costPrice !== undefined ? Number(ticket.costPrice) : null;
  const availableRefund = financials.availableRefund || 0;
  const defaultCustomerRefund = availableRefund > 0 ? availableRefund : 0;
  const defaultAirlineRefund = 0;
  const isFullRefund = availableRefund > 0 && Math.abs(defaultCustomerRefund - availableRefund) < 0.001;

  openModal({
    title: `${t('modals.processRefund.title')} #${ticket.id}`,
    subtitle: `${t('modals.processRefund.availableRefundable')} ${formatCurrency(availableRefund, financials.currency)}`,
    contentHtml: `
      <form id="add-refund-form" class="d-flex flex-column gap-md">
        <!-- If costPrice missing, allow entering it -->
        ${costPriceVal === null ? `
        <div class="card p-sm bg-surface-raised border">
          <label class="form-label font-bold text-primary" for="refund-cost-price">${escapeHtml(t('modals.processRefund.costPrice'))} *</label>
          <input
            type="number"
            id="refund-cost-price"
            class="form-control tabular-nums"
            placeholder="0.00"
            min="0"
            step="0.01"
            required
          />
          <span class="text-xs text-muted mt-xxs">${escapeHtml(t('modals.processRefund.costPriceMissingHint'))}</span>
        </div>
        ` : ''}

        <div class="form-grid-2">
          <div class="form-group">
            <label class="form-label" for="refund-customer-amount">${escapeHtml(t('modals.processRefund.refundAmount'))} *</label>
            <input
              type="number"
              id="refund-customer-amount"
              class="form-control tabular-nums"
              placeholder="0.00"
              value="${defaultCustomerRefund || ''}"
              max="${availableRefund}"
              min="0.01"
              step="0.01"
              required
            />
            <span class="text-xs text-muted mt-xxs">${escapeHtml(t('modals.processRefund.availableRefundable'))} ${formatCurrency(availableRefund, financials.currency)}</span>
          </div>

          <div class="form-group">
            <label class="form-label" for="refund-airline-amount">${escapeHtml(t('modals.processRefund.airlineRefundAmount'))} *</label>
            <input
              type="number"
              id="refund-airline-amount"
              class="form-control tabular-nums"
              placeholder="0.00"
              value="${defaultAirlineRefund}"
              min="0"
              step="0.01"
              required
            />
            <span class="text-xs text-muted mt-xxs">${costPriceVal !== null ? `${escapeHtml(t('modals.processRefund.costPriceLabel'))} ${formatCurrency(costPriceVal, financials.currency)}` : ''}</span>
          </div>
        </div>

        <!-- Live Financial Summary Card -->
        <div class="card p-sm bg-surface-raised border" id="refund-live-summary-box">
          <div class="font-bold text-xs text-uppercase text-muted mb-xs">${escapeHtml(t('modals.processRefund.financialSummaryTitle'))}</div>
          <div class="d-flex flex-column gap-xxs text-sm">
            <div class="d-flex justify-between">
              <span class="text-muted">${escapeHtml(t('modals.processRefund.airlinePenalty'))}</span>
              <strong id="summary-airline-penalty" class="tabular-nums text-danger">0.00 ${financials.currency}</strong>
            </div>
            <div class="d-flex justify-between">
              <span class="text-muted">${escapeHtml(t('modals.processRefund.customerDeduction'))}</span>
              <strong id="summary-customer-deduction" class="tabular-nums text-primary">0.00 ${financials.currency}</strong>
            </div>
            <div class="border-top pt-xxs mt-xxs d-flex justify-between font-bold">
              <span>${escapeHtml(t('modals.processRefund.netAgencyImpact'))}</span>
              <span id="summary-net-impact" class="tabular-nums font-bold">0.00 ${financials.currency}</span>
            </div>
          </div>
        </div>

        <div class="form-grid-2">
          <div class="form-group">
            <label class="form-label" for="refund-reason">${escapeHtml(t('modals.processRefund.reason'))} *</label>
            <select id="refund-reason" class="form-control" required>
              <option value="Customer Cancellation">Customer Cancellation (إلغاء من العميل)</option>
              <option value="Flight Cancelled by Airline">Flight Cancelled by Airline (إلغاء من شركة الطيران)</option>
              <option value="Medical Emergency">Medical Emergency (ظرف طبي)</option>
              <option value="Schedule Incompatibility">Schedule Incompatibility (عدم توافق المواعيد)</option>
            </select>
          </div>

          <div class="form-group">
            <label class="form-label" for="refund-status">${escapeHtml(t('common.status'))}</label>
            <select id="refund-status" class="form-control">
              <option value="COMPLETED">${escapeHtml(t('modals.processRefund.statusCompleted') || 'COMPLETED (Processed)')}</option>
              <option value="PENDING">${escapeHtml(t('modals.processRefund.statusPending') || 'PENDING (Under Review)')}</option>
            </select>
          </div>
        </div>

        <div class="form-check">
          <label class="d-flex items-center gap-xs cursor-pointer mb-0">
            <input type="checkbox" id="refund-close-ticket" ${isFullRefund ? 'checked' : ''} />
            <span class="font-medium text-sm">${escapeHtml(t('modals.processRefund.closeTicketRefunded'))}</span>
          </label>
        </div>
      </form>
    `,
    footerHtml: `
      <button type="button" class="btn btn-secondary" id="modal-cancel-refund">${escapeHtml(t('common.cancel'))}</button>
      <button type="button" class="btn btn-danger" id="modal-submit-refund">${escapeHtml(t('modals.processRefund.submit'))}</button>
    `,
    onOpen: (modalEl) => {
      const cancelBtn = modalEl.querySelector('#modal-cancel-refund');
      const submitBtn = modalEl.querySelector('#modal-submit-refund');
      const custInput = modalEl.querySelector('#refund-customer-amount');
      const airInput = modalEl.querySelector('#refund-airline-amount');
      const costInput = modalEl.querySelector('#refund-cost-price');
      const closeTicketCheckbox = modalEl.querySelector('#refund-close-ticket');

      const updateSummary = () => {
        if (closeTicketCheckbox && custInput) {
          const currentRefund = Number(custInput.value) || 0;
          closeTicketCheckbox.checked = availableRefund > 0 && Math.abs(currentRefund - availableRefund) < 0.001;
        }
        const cost = costInput ? (Number(costInput.value) || 0) : (costPriceVal || 0);
        const customerRefund = Number(custInput?.value) || 0;
        const airlineRefund = Number(airInput?.value) || 0;
        const totalPaid = financials.totalPaid || 0;

        const airlinePenalty = Math.max(0, cost - airlineRefund);
        const customerDeduction = Math.max(0, totalPaid - customerRefund);
        const netImpact = customerDeduction - airlinePenalty;

        const penEl = modalEl.querySelector('#summary-airline-penalty');
        const dedEl = modalEl.querySelector('#summary-customer-deduction');
        const netEl = modalEl.querySelector('#summary-net-impact');

        if (penEl) penEl.textContent = formatCurrency(airlinePenalty, financials.currency);
        if (dedEl) dedEl.textContent = formatCurrency(customerDeduction, financials.currency);
        if (netEl) {
          netEl.textContent = formatCurrency(netImpact, financials.currency);
          netEl.style.color = netImpact >= 0 ? 'var(--color-success, #10b981)' : 'var(--color-danger, #ef4444)';
        }
      };

      if (custInput) custInput.addEventListener('input', updateSummary);
      if (airInput) airInput.addEventListener('input', updateSummary);
      if (costInput) costInput.addEventListener('input', updateSummary);

      updateSummary();

      if (cancelBtn) cancelBtn.addEventListener('click', closeModal);

      if (submitBtn) {
        submitBtn.addEventListener('click', async () => {
          const amount = Number(custInput?.value) || 0;
          const airlineRefundAmount = Number(airInput?.value) || 0;
          const costPrice = costInput ? Number(costInput.value) : undefined;
          const reason = modalEl.querySelector('#refund-reason').value;
          const status = modalEl.querySelector('#refund-status').value;
          const isCompletedCancellation = modalEl.querySelector('#refund-close-ticket')?.checked ?? false;

          submitBtn.disabled = true;
          const payload = {
            amount,
            airlineRefundAmount,
            reason,
            status,
            isCompletedCancellation,
            currency: ticket.currency
          };
          if (costPrice !== undefined && !isNaN(costPrice) && costPrice >= 0) {
            payload.costPrice = costPrice;
          }

          const result = await TicketService.addRefund(ticket.id, payload);
          submitBtn.disabled = false;

          if (!result.success) {
            showToast(result.error.message, 'error');
            return;
          }

          closeModal();
          showToast(t('toasts.refundCreated'), 'success');
          if (onSuccess) onSuccess();
        });
      }
    }
  });
}

export function openEditTicketModal(ticket, onSuccess) {
  const currentUser = AuthService.getCurrentUser();
  const isAdmin = (currentUser?.role || '').toUpperCase() === 'ADMIN';

  openModal({
    title: `${t('common.edit')} #${ticket.id}`,
    subtitle: t('ticketDetails.overview.passengerCard'),
    contentHtml: `
      <div class="d-flex flex-column gap-md">
        <div class="form-grid-2">
          <div class="form-group">
            <label class="form-label" for="edit-pax-name">${escapeHtml(t('ticketCreate.passengerInfo.passengerName'))} *</label>
            <input type="text" id="edit-pax-name" class="form-control" value="${escapeHtml(ticket.passengerName || '')}" required />
          </div>
          <div class="form-group">
            <label class="form-label" for="edit-pax-phone">${escapeHtml(t('ticketCreate.passengerInfo.phone'))}</label>
            <input type="text" id="edit-pax-phone" class="form-control ltr-field" value="${escapeHtml(ticket.phone || '')}" />
          </div>
        </div>

        <div class="form-grid-2">
          <div class="form-group">
            <label class="form-label" for="edit-pnr">${escapeHtml(t('tickets.pnr'))}</label>
            <input type="text" id="edit-pnr" class="form-control ltr-field" value="${escapeHtml(ticket.pnr || '')}" maxlength="10" />
          </div>
          <div class="form-group">
            <label class="form-label" for="edit-ticket-number">${escapeHtml(t('tickets.ticketNumber'))}</label>
            <input type="text" id="edit-ticket-number" class="form-control ltr-field" value="${escapeHtml(ticket.ticketNumber || '')}" />
          </div>
        </div>

        <div class="form-grid-2">
          <div class="form-group">
            <label class="form-label" for="edit-flight-number">${escapeHtml(t('tickets.flightNumber'))}</label>
            <input type="text" id="edit-flight-number" class="form-control ltr-field" value="${escapeHtml(ticket.flightNumber || '')}" />
          </div>
          <div class="form-group">
            <label class="form-label" for="edit-route">${escapeHtml(t('tickets.route'))}</label>
            <div class="d-flex gap-sm">
              <input type="text" id="edit-origin" class="form-control ltr-field" style="width: 50%;" maxlength="3" value="${escapeHtml(ticket.origin || '')}" placeholder="CAI" />
              <input type="text" id="edit-destination" class="form-control ltr-field" style="width: 50%;" maxlength="3" value="${escapeHtml(ticket.destination || '')}" placeholder="DXB" />
            </div>
          </div>
        </div>

        <div class="form-grid-2">
          <div class="form-group">
            <label class="form-label" for="edit-seat">${escapeHtml(t('tickets.seatAssignment'))}</label>
            <input type="text" id="edit-seat" class="form-control ltr-field" value="${escapeHtml(ticket.seat || '12A')}" />
          </div>
          <div class="form-group">
            <label class="form-label" for="edit-baggage">${escapeHtml(t('tickets.baggageAllowance'))}</label>
            <input type="text" id="edit-baggage" class="form-control" value="${escapeHtml(ticket.baggage || '1 x 23kg')}" />
          </div>
        </div>

        <div class="form-grid-2">
          <div class="form-group">
            <label class="form-label" for="edit-dep-date">${escapeHtml(t('tickets.table.travelDate'))}</label>
            <input type="date" id="edit-dep-date" class="form-control" value="${ticket.departureDate ? ticket.departureDate.slice(0, 10) : ''}" />
          </div>
          <div class="form-group">
            <label class="form-label" for="edit-status">${escapeHtml(t('common.status'))}</label>
            <select id="edit-status" class="form-control">
              <option value="CONFIRMED" ${ticket.status === 'CONFIRMED' ? 'selected' : ''}>${escapeHtml(i18n.translateStatus('CONFIRMED'))}</option>
              <option value="PARTIALLY PAID" ${ticket.status === 'PARTIALLY PAID' ? 'selected' : ''}>${escapeHtml(i18n.translateStatus('PARTIALLY PAID'))}</option>
              <option value="UNPAID" ${ticket.status === 'UNPAID' ? 'selected' : ''}>${escapeHtml(i18n.translateStatus('UNPAID'))}</option>
              <option value="CANCELLED" ${ticket.status === 'CANCELLED' ? 'selected' : ''}>${escapeHtml(i18n.translateStatus('CANCELLED'))}</option>
              <option value="REFUNDED" ${ticket.status === 'REFUNDED' ? 'selected' : ''}>${escapeHtml(i18n.translateStatus('REFUNDED'))}</option>
            </select>
          </div>
        </div>

        ${isAdmin ? `
          <div class="form-grid-2">
            <div class="form-group">
              <label class="form-label" for="edit-ticket-price">${escapeHtml(t('tickets.ticketPrice', 'Ticket Price (Sale Price)'))}</label>
              <input type="number" id="edit-ticket-price" class="form-control tabular-nums" value="${ticket.ticketPrice != null ? ticket.ticketPrice : ''}" min="1" step="any" placeholder="0.00" />
            </div>
            <div class="form-group">
              <label class="form-label" for="edit-cost-price">${escapeHtml(t('ticketDetails.overview.costPrice'))}</label>
              <input type="number" id="edit-cost-price" class="form-control tabular-nums" value="${ticket.costPrice != null ? ticket.costPrice : ''}" min="1" step="any" placeholder="0.00" />
            </div>
          </div>
        ` : ''}
      </div>
    `,
    footerHtml: `
      <button type="button" class="btn btn-secondary" id="modal-cancel-edit-ticket">${escapeHtml(t('common.cancel'))}</button>
      <button type="button" class="btn btn-primary" id="modal-save-edit-ticket">${escapeHtml(t('common.saveChanges'))}</button>
    `,
    onOpen: (modalEl) => {
      const cancelBtn = modalEl.querySelector('#modal-cancel-edit-ticket');
      const saveBtn = modalEl.querySelector('#modal-save-edit-ticket');

      if (cancelBtn) cancelBtn.addEventListener('click', closeModal);
      if (saveBtn) {
        saveBtn.addEventListener('click', async () => {
          const name = modalEl.querySelector('#edit-pax-name').value.trim();
          if (!name) {
            showToast(t('validation.emptyPassenger'), 'error');
            return;
          }

          const updatePayload = {
            passengerName: name,
            phone: modalEl.querySelector('#edit-pax-phone').value.trim(),
            pnr: modalEl.querySelector('#edit-pnr').value.trim(),
            ticketNumber: modalEl.querySelector('#edit-ticket-number').value.trim(),
            flightNumber: modalEl.querySelector('#edit-flight-number').value.trim(),
            origin: modalEl.querySelector('#edit-origin').value.trim().toUpperCase(),
            destination: modalEl.querySelector('#edit-destination').value.trim().toUpperCase(),
            seat: modalEl.querySelector('#edit-seat').value.trim(),
            baggage: modalEl.querySelector('#edit-baggage').value.trim(),
            departureDate: modalEl.querySelector('#edit-dep-date').value || ticket.departureDate,
            status: modalEl.querySelector('#edit-status').value
          };

          const costPriceEl = modalEl.querySelector('#edit-cost-price');
          if (costPriceEl && costPriceEl.value !== '') {
            updatePayload.costPrice = Number(costPriceEl.value);
          }
          const ticketPriceEl = modalEl.querySelector('#edit-ticket-price');
          if (ticketPriceEl && ticketPriceEl.value !== '') {
            updatePayload.ticketPrice = Number(ticketPriceEl.value);
          }

          saveBtn.disabled = true;
          let result = await TicketService.updateTicket(ticket.id, updatePayload);

          // If the new ticket price is below what the customer already paid, the
          // backend returns PRICE_BELOW_PAID instead of silently clamping the balance
          // to zero. Ask the agent to explicitly confirm before retrying.
          if (!result.success && result.error?.code === 'PRICE_BELOW_PAID') {
            const confirmed = window.confirm(`${result.error.message}\n\nProceed anyway?`);
            if (confirmed) {
              updatePayload.confirmPriceBelowPaid = true;
              result = await TicketService.updateTicket(ticket.id, updatePayload);
            } else {
              saveBtn.disabled = false;
              return;
            }
          }

          saveBtn.disabled = false;

          if (!result.success) {
            showToast(result.error.message, 'error');
            return;
          }

          closeModal();
          showToast(t('toasts.ticketUpdated'), 'success');
          if (onSuccess) onSuccess();
        });
      }
    }
  });
}

export function openDeleteTicketModal(ticket, onSuccess) {
  const confirmValue = ticket.ticketNumber || ticket.id;
  openModal({
    title: `${t('modals.deleteTicket.title') || t('common.delete') || 'Delete Ticket'} #${confirmValue}`,
    subtitle: `${ticket.passengerName} (${ticket.origin} ✈ ${ticket.destination})`,
    contentHtml: `
      <div class="d-flex flex-column gap-md">
        <div class="p-md rounded-md" style="background-color: rgba(239, 68, 68, 0.08); border: 1px solid rgba(239, 68, 68, 0.2); border-radius: var(--radius-md);">
          <div class="font-semibold text-danger mb-xs" style="font-size: 14px;">
            ⚠️ ${escapeHtml(t('modals.deleteTicket.warningPermanent') || 'تحذير: حذف نهائي لا يمكن التراجع عنه')}
          </div>
          <p class="text-xs text-muted" style="margin: 0; line-height: 1.5;">
            ${escapeHtml(t('modals.deleteTicket.explanationPermanent') || 'سيتم حذف التذكرة نهائيًا بالإضافة إلى جميع المدفوعات والاستردادات المرتبطة بها. لن يمكن استرجاعها بعد ذلك، وسيتم الاحتفاظ فقط بسجل مختصر في سجل النشاط.')}
          </p>
        </div>

        <p class="text-sm" style="margin: 0; text-align: center;">
          ${escapeHtml(t('modals.deleteTicket.confirmQuestion') || 'هل أنت متأكد من حذف هذه التذكرة؟')}
        </p>

        <div id="delete-ticket-error-box" class="p-sm text-sm text-danger" style="display: none; background-color: rgba(239, 68, 68, 0.1); border-radius: var(--radius-md); border: 1px solid rgba(239, 68, 68, 0.3);"></div>
      </div>
    `,
    footerHtml: `
      <button type="button" class="btn btn-secondary" id="modal-cancel-delete-ticket">${escapeHtml(t('modals.deleteTicket.no') || t('common.no') || 'لا')}</button>
      <button type="button" class="btn btn-danger" id="modal-confirm-delete-ticket">${escapeHtml(t('modals.deleteTicket.yes') || t('common.yes') || 'نعم')}</button>
    `,
    onOpen: (modalEl) => {
      const cancelBtn = modalEl.querySelector('#modal-cancel-delete-ticket');
      const confirmBtn = modalEl.querySelector('#modal-confirm-delete-ticket');
      const errorBox = modalEl.querySelector('#delete-ticket-error-box');

      if (cancelBtn) cancelBtn.addEventListener('click', closeModal);

      if (confirmBtn) {
        confirmBtn.addEventListener('click', async () => {
          confirmBtn.disabled = true;
          if (errorBox) {
            errorBox.style.display = 'none';
            errorBox.textContent = '';
          }

          const result = await TicketService.deleteTicket(ticket.id);
          confirmBtn.disabled = false;

          if (!result.success) {
            const msg = result.error?.message || 'Failed to delete ticket';
            if (errorBox) {
              errorBox.textContent = msg;
              errorBox.style.display = 'block';
            }
            showToast(msg, 'error');
            return;
          }

          closeModal();
          showToast(t('toasts.ticketDeleted') || 'Ticket deleted successfully', 'success');
          if (onSuccess) onSuccess();
        });
      }
    }
  });
}

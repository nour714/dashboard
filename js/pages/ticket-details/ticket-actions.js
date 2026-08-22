/**
 * AfricaTravel — Ticket Action Modals (Payment, Modification, Refund, Edit)
 */

import { TicketService } from '../../services/ticket-service.js';
import { openModal, closeModal } from '../../components/modal.js';
import { showToast } from '../../components/toast.js';
import { formatCurrency } from '../../utils/calculations.js';
import { escapeHtml } from '../../utils/security.js';
import { t } from '../../i18n/i18n.js';

export function openAddPaymentModal(ticket, onSuccess) {
  const financials = TicketService.getTicketFinancials(ticket);

  openModal({
    title: `${t('modals.addPayment.title')} #${ticket.id}`,
    subtitle: `${t('modals.addPayment.remainingIs')} ${formatCurrency(financials.remaining, financials.currency)}`,
    contentHtml: `
      <form id="record-payment-form" class="d-flex flex-column gap-md">
        <div class="form-grid-2">
          <div class="form-group">
            <label class="form-label" for="pay-amount">${escapeHtml(t('modals.addPayment.amount'))} *</label>
            <input
              type="number"
              id="pay-amount"
              class="form-control tabular-nums"
              placeholder="0.00"
              value="${financials.remaining > 0 ? financials.remaining : ''}"
              max="${financials.remaining}"
              min="1"
              step="0.01"
              required
            />
            <span class="text-xs text-muted mt-xxs">${escapeHtml(t('modals.addPayment.remainingIs'))} ${formatCurrency(financials.remaining, financials.currency)}</span>
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

      if (cancelBtn) cancelBtn.addEventListener('click', closeModal);

      if (submitBtn) {
        submitBtn.addEventListener('click', async () => {
          const amount = Number(modalEl.querySelector('#pay-amount').value);
          const method = modalEl.querySelector('#pay-method').value;
          const date = modalEl.querySelector('#pay-date').value;
          const reference = modalEl.querySelector('#pay-ref').value.trim();
          const notes = modalEl.querySelector('#pay-notes').value.trim();

          submitBtn.disabled = true;
          const result = await TicketService.addPayment(ticket.id, {
            amount,
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
  openModal({
    title: `${t('modals.modifyFlight.title')} #${ticket.id}`,
    subtitle: `${ticket.origin} ✈ ${ticket.destination} (${ticket.flightNumber || 'MS 901'})`,
    contentHtml: `
      <form id="modify-flight-form" class="d-flex flex-column gap-md">
        <div class="form-grid-2">
          <div class="form-group">
            <label class="form-label" for="mod-flight-num">${escapeHtml(t('modals.modifyFlight.newFlightNumber'))}</label>
            <input type="text" id="mod-flight-num" class="form-control ltr-field" value="${escapeHtml(ticket.flightNumber || 'MS 905')}" required />
          </div>

          <div class="form-group">
            <label class="form-label" for="mod-change-fee">${escapeHtml(t('modals.modifyFlight.modFee'))}</label>
            <input type="number" id="mod-change-fee" class="form-control tabular-nums" value="1200" min="0" />
          </div>
        </div>

        <div class="form-grid-2">
          <div class="form-group">
            <label class="form-label" for="mod-dep-date">${escapeHtml(t('modals.modifyFlight.newDeparture'))} *</label>
            <input type="datetime-local" id="mod-dep-date" class="form-control" value="${ticket.departureDate || ''}" required />
          </div>

          <div class="form-group">
            <label class="form-label" for="mod-arr-date">${escapeHtml(t('modals.modifyFlight.newArrival'))} *</label>
            <input type="datetime-local" id="mod-arr-date" class="form-control" value="${ticket.arrivalDate || ''}" required />
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
    `,
    footerHtml: `
      <button type="button" class="btn btn-secondary" id="modal-cancel-mod">${escapeHtml(t('common.cancel'))}</button>
      <button type="button" class="btn btn-primary" id="modal-submit-mod">${escapeHtml(t('modals.modifyFlight.submit'))}</button>
    `,
    onOpen: (modalEl) => {
      const cancelBtn = modalEl.querySelector('#modal-cancel-mod');
      const submitBtn = modalEl.querySelector('#modal-submit-mod');

      if (cancelBtn) cancelBtn.addEventListener('click', closeModal);

      if (submitBtn) {
        submitBtn.addEventListener('click', async () => {
          const flightNumber = modalEl.querySelector('#mod-flight-num').value.trim();
          const changeFee = Number(modalEl.querySelector('#mod-change-fee').value) || 0;
          const newDepartureDate = modalEl.querySelector('#mod-dep-date').value;
          const newArrivalDate = modalEl.querySelector('#mod-arr-date').value;
          const reason = modalEl.querySelector('#mod-reason').value;
          const note = modalEl.querySelector('#mod-note').value.trim();

          submitBtn.disabled = true;
          const result = await TicketService.addModification(ticket.id, {
            flightNumber,
            changeFee,
            newDepartureDate,
            newArrivalDate,
            reason,
            note,
            currency: ticket.currency
          });
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

  openModal({
    title: `${t('modals.processRefund.title')} #${ticket.id}`,
    subtitle: `${t('modals.processRefund.availableRefundable')} ${formatCurrency(financials.availableRefund, financials.currency)}`,
    contentHtml: `
      <form id="add-refund-form" class="d-flex flex-column gap-md">
        <div class="form-grid-2">
          <div class="form-group">
            <label class="form-label" for="refund-amount">${escapeHtml(t('modals.processRefund.refundAmount'))} *</label>
            <input
              type="number"
              id="refund-amount"
              class="form-control tabular-nums"
              placeholder="0.00"
              value="${financials.availableRefund > 0 ? financials.availableRefund : ''}"
              max="${financials.availableRefund}"
              min="1"
              step="0.01"
              required
            />
            <span class="text-xs text-muted mt-xxs">${escapeHtml(t('modals.processRefund.availableRefundable'))} ${formatCurrency(financials.availableRefund, financials.currency)}</span>
          </div>

          <div class="form-group">
            <label class="form-label" for="refund-status">${escapeHtml(t('common.status'))}</label>
            <select id="refund-status" class="form-control">
              <option value="COMPLETED">COMPLETED (مكتمل)</option>
              <option value="REQUESTED">REQUESTED (طلب استرداد)</option>
            </select>
          </div>
        </div>

        <div class="form-group">
          <label class="form-label" for="refund-reason">${escapeHtml(t('modals.processRefund.reason'))} *</label>
          <select id="refund-reason" class="form-control" required>
            <option value="Customer Cancellation">Customer Cancellation (إلغاء من العميل)</option>
            <option value="Flight Cancelled by Airline">Flight Cancelled by Airline (إلغاء من شركة الطيران)</option>
            <option value="Medical Emergency">Medical Emergency (ظرف طبي)</option>
            <option value="Schedule Incompatibility">Schedule Incompatibility (عدم توافق المواعيد)</option>
          </select>
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

      if (cancelBtn) cancelBtn.addEventListener('click', closeModal);

      if (submitBtn) {
        submitBtn.addEventListener('click', async () => {
          const amount = Number(modalEl.querySelector('#refund-amount').value);
          const reason = modalEl.querySelector('#refund-reason').value;
          const status = modalEl.querySelector('#refund-status').value;

          submitBtn.disabled = true;
          const result = await TicketService.addRefund(ticket.id, {
            amount,
            reason,
            status,
            currency: ticket.currency
          });
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
            <label class="form-label" for="edit-seat">Seat Assignment</label>
            <input type="text" id="edit-seat" class="form-control ltr-field" value="${escapeHtml(ticket.seat || '12A')}" />
          </div>
          <div class="form-group">
            <label class="form-label" for="edit-baggage">Baggage Allowance</label>
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
              <option value="CONFIRMED" ${ticket.status === 'CONFIRMED' ? 'selected' : ''}>CONFIRMED</option>
              <option value="PARTIALLY PAID" ${ticket.status === 'PARTIALLY PAID' ? 'selected' : ''}>PARTIALLY PAID</option>
              <option value="PAID" ${ticket.status === 'PAID' ? 'selected' : ''}>PAID</option>
              <option value="CANCELLED" ${ticket.status === 'CANCELLED' ? 'selected' : ''}>CANCELLED</option>
            </select>
          </div>
        </div>
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

          saveBtn.disabled = true;
          const result = await TicketService.updateTicket(ticket.id, {
            passengerName: name,
            phone: modalEl.querySelector('#edit-pax-phone').value.trim(),
            seat: modalEl.querySelector('#edit-seat').value.trim(),
            baggage: modalEl.querySelector('#edit-baggage').value.trim(),
            departureDate: modalEl.querySelector('#edit-dep-date').value || ticket.departureDate,
            status: modalEl.querySelector('#edit-status').value
          });
          saveBtn.disabled = false;

          if (!result.success) {
            showToast(result.error.message, 'error');
            return;
          }

          closeModal();
          showToast(t('toasts.customerUpdated'), 'success');
          if (onSuccess) onSuccess();
        });
      }
    }
  });
}

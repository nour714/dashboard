/**
 * AfricaTravel — Ticket Action Modals (Payment, Modification, Refund, Edit)
 */

import { TicketService } from '../../services/ticket-service.js';
import { openModal, closeModal } from '../../components/modal.js';
import { showToast } from '../../components/toast.js';
import { formatCurrency } from '../../utils/calculations.js';
import { escapeHtml } from '../../utils/security.js';

export function openAddPaymentModal(ticket, onSuccess) {
  const financials = TicketService.getTicketFinancials(ticket);

  openModal({
    title: `Record Payment for Ticket #${ticket.id}`,
    subtitle: `Remaining balance: ${formatCurrency(financials.remaining, financials.currency)}`,
    contentHtml: `
      <form id="record-payment-form" class="d-flex flex-column gap-md">
        <div class="form-grid-2">
          <div class="form-group">
            <label class="form-label" for="pay-amount">Payment Amount (${escapeHtml(ticket.currency)}) *</label>
            <input
              type="number"
              id="pay-amount"
              class="form-control"
              placeholder="0.00"
              value="${financials.remaining > 0 ? financials.remaining : ''}"
              max="${financials.remaining}"
              min="1"
              step="0.01"
              required
            />
            <span class="text-xs text-muted mt-xxs">Max payable: ${formatCurrency(financials.remaining, financials.currency)}</span>
          </div>

          <div class="form-group">
            <label class="form-label" for="pay-method">Payment Method *</label>
            <select id="pay-method" class="form-control" required>
              <option value="Credit Card">Credit Card</option>
              <option value="Cash">Cash</option>
              <option value="Bank Transfer">Bank Transfer</option>
              <option value="Corporate Credit">Corporate Credit</option>
              <option value="POS Terminal">POS Terminal</option>
            </select>
          </div>
        </div>

        <div class="form-grid-2">
          <div class="form-group">
            <label class="form-label" for="pay-date">Transaction Date *</label>
            <input type="datetime-local" id="pay-date" class="form-control" value="${new Date().toISOString().slice(0, 16)}" required />
          </div>

          <div class="form-group">
            <label class="form-label" for="pay-ref">Reference / Auth Code</label>
            <input type="text" id="pay-ref" class="form-control" placeholder="e.g. AUTH-VISA-8821" value="REF-${Math.floor(100000 + Math.random() * 900000)}" />
          </div>
        </div>

        <div class="form-group">
          <label class="form-label" for="pay-notes">Transaction Notes</label>
          <textarea id="pay-notes" class="form-control" placeholder="Optional internal notes..."></textarea>
        </div>
      </form>
    `,
    footerHtml: `
      <button type="button" class="btn btn-secondary" id="modal-cancel-pay">Cancel</button>
      <button type="button" class="btn btn-primary" id="modal-submit-pay">Record Payment</button>
    `,
    onOpen: (modalEl) => {
      const cancelBtn = modalEl.querySelector('#modal-cancel-pay');
      const submitBtn = modalEl.querySelector('#modal-submit-pay');

      if (cancelBtn) cancelBtn.addEventListener('click', closeModal);

      if (submitBtn) {
        submitBtn.addEventListener('click', () => {
          const amount = Number(modalEl.querySelector('#pay-amount').value);
          const method = modalEl.querySelector('#pay-method').value;
          const date = modalEl.querySelector('#pay-date').value;
          const reference = modalEl.querySelector('#pay-ref').value.trim();
          const notes = modalEl.querySelector('#pay-notes').value.trim();

          const result = TicketService.addPayment(ticket.id, {
            amount,
            method,
            date,
            reference,
            notes,
            currency: ticket.currency
          });

          if (!result.success) {
            showToast(result.error.message, 'error');
            return;
          }

          closeModal();
          showToast(`Payment of ${formatCurrency(amount, ticket.currency)} recorded successfully!`, 'success');
          if (onSuccess) onSuccess();
        });
      }
    }
  });
}

export function openModifyFlightModal(ticket, onSuccess) {
  openModal({
    title: `Modify Flight Schedule — Ticket #${ticket.id}`,
    subtitle: `Current: ${ticket.origin} → ${ticket.destination} (${ticket.flightNumber || 'MS 901'})`,
    contentHtml: `
      <form id="modify-flight-form" class="d-flex flex-column gap-md">
        <div class="form-grid-2">
          <div class="form-group">
            <label class="form-label" for="mod-flight-num">New Flight Number</label>
            <input type="text" id="mod-flight-num" class="form-control" value="${escapeHtml(ticket.flightNumber || 'MS 905')}" required />
          </div>

          <div class="form-group">
            <label class="form-label" for="mod-change-fee">Change / Reissue Fee (${escapeHtml(ticket.currency)})</label>
            <input type="number" id="mod-change-fee" class="form-control" value="1200" min="0" step="1" required />
          </div>
        </div>

        <div class="form-grid-2">
          <div class="form-group">
            <label class="form-label" for="mod-dep-date">New Departure Date & Time *</label>
            <input type="datetime-local" id="mod-dep-date" class="form-control" value="${ticket.departureDate ? ticket.departureDate.slice(0, 16) : ''}" required />
          </div>

          <div class="form-group">
            <label class="form-label" for="mod-arr-date">New Arrival Date & Time</label>
            <input type="datetime-local" id="mod-arr-date" class="form-control" value="${ticket.arrivalDate ? ticket.arrivalDate.slice(0, 16) : ''}" />
          </div>
        </div>

        <div class="form-group">
          <label class="form-label" for="mod-reason">Reason for Modification *</label>
          <input type="text" id="mod-reason" class="form-control" placeholder="e.g. Customer requested date change" value="Customer requested schedule adjustment" required />
        </div>

        <div class="form-group">
          <label class="form-label" for="mod-notes">Schedule Change Note</label>
          <textarea id="mod-notes" class="form-control" placeholder="e.g. Reissued on ticket stock 077-9921827361..."></textarea>
        </div>
      </form>
    `,
    footerHtml: `
      <button type="button" class="btn btn-secondary" id="modal-cancel-mod">Cancel</button>
      <button type="button" class="btn btn-primary" id="modal-submit-mod">Apply Modification</button>
    `,
    onOpen: (modalEl) => {
      const cancelBtn = modalEl.querySelector('#modal-cancel-mod');
      const submitBtn = modalEl.querySelector('#modal-submit-mod');

      if (cancelBtn) cancelBtn.addEventListener('click', closeModal);

      if (submitBtn) {
        submitBtn.addEventListener('click', () => {
          const flightNumber = modalEl.querySelector('#mod-flight-num').value.trim();
          const changeFee = Number(modalEl.querySelector('#mod-change-fee').value);
          const newDepartureDate = modalEl.querySelector('#mod-dep-date').value;
          const newArrivalDate = modalEl.querySelector('#mod-arr-date').value;
          const reason = modalEl.querySelector('#mod-reason').value.trim();
          const note = modalEl.querySelector('#mod-notes').value.trim();

          const result = TicketService.addModification(ticket.id, {
            flightNumber,
            changeFee,
            newDepartureDate,
            newArrivalDate,
            reason,
            note,
            currency: ticket.currency
          });

          if (!result.success) {
            showToast(result.error.message, 'error');
            return;
          }

          closeModal();
          showToast(`Flight schedule updated successfully!`, 'success');
          if (onSuccess) onSuccess();
        });
      }
    }
  });
}

export function openAddRefundModal(ticket, onSuccess) {
  const financials = TicketService.getTicketFinancials(ticket);

  openModal({
    title: `Process Refund for Ticket #${ticket.id}`,
    subtitle: `Total Paid: ${formatCurrency(financials.totalPaid, financials.currency)} | Already Refunded: ${formatCurrency(financials.totalRefunded, financials.currency)} | Max Available: ${formatCurrency(financials.availableRefund, financials.currency)}`,
    contentHtml: `
      <form id="add-refund-form" class="d-flex flex-column gap-md">
        <div class="form-grid-2">
          <div class="form-group">
            <label class="form-label" for="refund-amount">Refund Amount (${escapeHtml(ticket.currency)}) *</label>
            <input
              type="number"
              id="refund-amount"
              class="form-control"
              placeholder="0.00"
              value="${financials.availableRefund > 0 ? financials.availableRefund : ''}"
              max="${financials.availableRefund}"
              min="1"
              step="0.01"
              required
            />
            <span class="text-xs text-muted mt-xxs">Max refundable: ${formatCurrency(financials.availableRefund, financials.currency)}</span>
          </div>

          <div class="form-group">
            <label class="form-label" for="refund-status">Refund Action</label>
            <select id="refund-status" class="form-control">
              <option value="COMPLETED">Process & Finalize Refund Immediately</option>
              <option value="REQUESTED">Submit Refund Request for Approval</option>
            </select>
          </div>
        </div>

        <div class="form-group">
          <label class="form-label" for="refund-reason">Refund Reason *</label>
          <select id="refund-reason" class="form-control" required>
            <option value="Customer Cancellation">Customer Cancellation</option>
            <option value="Flight Cancelled by Airline">Flight Cancelled by Airline</option>
            <option value="Medical Emergency">Medical Emergency</option>
            <option value="Schedule Incompatibility">Schedule Incompatibility</option>
            <option value="Duplicate Booking">Duplicate Booking</option>
          </select>
        </div>
      </form>
    `,
    footerHtml: `
      <button type="button" class="btn btn-secondary" id="modal-cancel-refund">Cancel</button>
      <button type="button" class="btn btn-danger" id="modal-submit-refund">Execute Refund</button>
    `,
    onOpen: (modalEl) => {
      const cancelBtn = modalEl.querySelector('#modal-cancel-refund');
      const submitBtn = modalEl.querySelector('#modal-submit-refund');

      if (cancelBtn) cancelBtn.addEventListener('click', closeModal);

      if (submitBtn) {
        submitBtn.addEventListener('click', () => {
          const amount = Number(modalEl.querySelector('#refund-amount').value);
          const reason = modalEl.querySelector('#refund-reason').value;
          const status = modalEl.querySelector('#refund-status').value;

          const result = TicketService.addRefund(ticket.id, {
            amount,
            reason,
            status,
            currency: ticket.currency
          });

          if (!result.success) {
            showToast(result.error.message, 'error');
            return;
          }

          closeModal();
          showToast(`Refund of ${formatCurrency(amount, ticket.currency)} processed successfully!`, 'success');
          if (onSuccess) onSuccess();
        });
      }
    }
  });
}

export function openEditTicketModal(ticket, onSuccess) {
  openModal({
    title: `Edit Ticket #${ticket.id}`,
    subtitle: `Update passenger or reservation details`,
    contentHtml: `
      <div class="d-flex flex-column gap-md">
        <div class="form-grid-2">
          <div class="form-group">
            <label class="form-label" for="edit-pax-name">Passenger Name *</label>
            <input type="text" id="edit-pax-name" class="form-control" value="${escapeHtml(ticket.passengerName || '')}" required />
          </div>
          <div class="form-group">
            <label class="form-label" for="edit-pax-phone">Phone Number</label>
            <input type="text" id="edit-pax-phone" class="form-control" value="${escapeHtml(ticket.phone || '')}" />
          </div>
        </div>

        <div class="form-grid-2">
          <div class="form-group">
            <label class="form-label" for="edit-seat">Seat Assignment</label>
            <input type="text" id="edit-seat" class="form-control" value="${escapeHtml(ticket.seat || '12A')}" />
          </div>
          <div class="form-group">
            <label class="form-label" for="edit-baggage">Baggage Allowance</label>
            <input type="text" id="edit-baggage" class="form-control" value="${escapeHtml(ticket.baggage || '1 x 23kg')}" />
          </div>
        </div>

        <div class="form-grid-2">
          <div class="form-group">
            <label class="form-label" for="edit-dep-date">Departure Date</label>
            <input type="date" id="edit-dep-date" class="form-control" value="${ticket.departureDate ? ticket.departureDate.slice(0, 10) : ''}" />
          </div>
          <div class="form-group">
            <label class="form-label" for="edit-status">Status</label>
            <select id="edit-status" class="form-control">
              <option value="CONFIRMED" ${ticket.status === 'CONFIRMED' ? 'selected' : ''}>Confirmed</option>
              <option value="PARTIALLY PAID" ${ticket.status === 'PARTIALLY PAID' ? 'selected' : ''}>Partially Paid</option>
              <option value="PAID" ${ticket.status === 'PAID' ? 'selected' : ''}>Paid</option>
              <option value="CANCELLED" ${ticket.status === 'CANCELLED' ? 'selected' : ''}>Cancelled</option>
            </select>
          </div>
        </div>
      </div>
    `,
    footerHtml: `
      <button type="button" class="btn btn-secondary" id="modal-cancel-edit-ticket">Cancel</button>
      <button type="button" class="btn btn-primary" id="modal-save-edit-ticket">Save Changes</button>
    `,
    onOpen: (modalEl) => {
      const cancelBtn = modalEl.querySelector('#modal-cancel-edit-ticket');
      const saveBtn = modalEl.querySelector('#modal-save-edit-ticket');

      if (cancelBtn) cancelBtn.addEventListener('click', closeModal);
      if (saveBtn) {
        saveBtn.addEventListener('click', () => {
          const name = modalEl.querySelector('#edit-pax-name').value.trim();
          if (!name) {
            showToast('Passenger name is required', 'error');
            return;
          }

          const result = TicketService.updateTicket(ticket.id, {
            passengerName: name,
            phone: modalEl.querySelector('#edit-pax-phone').value.trim(),
            seat: modalEl.querySelector('#edit-seat').value.trim(),
            baggage: modalEl.querySelector('#edit-baggage').value.trim(),
            departureDate: modalEl.querySelector('#edit-dep-date').value || ticket.departureDate,
            status: modalEl.querySelector('#edit-status').value
          });

          if (!result.success) {
            showToast(result.error.message, 'error');
            return;
          }

          closeModal();
          showToast(`Ticket #${ticket.id} updated successfully!`, 'success');
          if (onSuccess) onSuccess();
        });
      }
    }
  });
}

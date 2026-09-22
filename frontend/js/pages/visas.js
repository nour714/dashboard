import { VisaService } from '../services/visa-service.js';
import { AuthService } from '../services/auth-service.js';
import { icons } from '../components/icons.js';
import { renderPageHeader } from '../components/page-header.js';
import { openModal, closeModal } from '../components/modal.js';
import { showToast } from '../components/toast.js';
import { formatCurrency, formatDateTime } from '../utils/calculations.js';
import { escapeHtml } from '../utils/security.js';
import { t } from '../i18n/i18n.js';

let currentFilters = { search: '', visaType: '', paymentStatus: '', currency: '', startDate: '', endDate: '', page: 1, pageSize: 25 };
let cachedVisas = [];
let cachedPagination = { page: 1, pageSize: 25, total: 0, totalPages: 1 };
let cachedTotals = null;
let isInitialLoaded = false;

function getVisaTypeBadge(visaType) {
  let bgClass = 'badge-primary';
  if (visaType === 'WORK') bgClass = 'badge-accent';
  else if (visaType === 'STUDY') bgClass = 'badge-info';
  else if (visaType === 'UMRAH_HAJJ') bgClass = 'badge-success';
  else if (visaType === 'MEDICAL') bgClass = 'badge-warning';
  
  const label = t('visas.types.' + visaType) || visaType;
  return `<span class="badge ${bgClass}">${escapeHtml(label)}</span>`;
}

function getPaymentBadge(status) {
  const label = t('visas.payment.' + status) || status;
  let bgClass = 'badge-danger';
  if (status === 'PAID') {
    bgClass = 'badge-success';
  } else if (status === 'PARTIAL') {
    bgClass = 'badge-warning';
  }
  return `<span class="badge ${bgClass}">${escapeHtml(label)}</span>`;
}

function openAddVisaModal(onSuccess) {
  const currentUser = AuthService.getCurrentUser();
  const isAdmin = (currentUser?.role || '').toUpperCase() === 'ADMIN';

  const now = new Date();
  const localIsoDate = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);

  openModal({
    title: t('visas.newVisaModalTitle') || 'New Visa',
    subtitle: t('visas.newVisaModalSubtitle') || 'Create a new visa record',
    contentHtml: `
      <form id="new-visa-form" class="d-flex flex-column gap-md">
        <div class="form-grid-2">
          <div class="form-group">
            <label class="form-label" for="new-visa-clientName">${escapeHtml(t('visas.form.clientName') || 'Client Name')} *</label>
            <input type="text" id="new-visa-clientName" class="form-control" required />
          </div>
          <div class="form-group">
            <label class="form-label" for="new-visa-phone">${escapeHtml(t('visas.form.phone') || 'Phone')}</label>
            <input type="text" id="new-visa-phone" class="form-control ltr-field" />
          </div>
        </div>

        <div class="form-grid-2">
          <div class="form-group">
            <label class="form-label" for="new-visa-type">${escapeHtml(t('visas.form.visaType') || 'Visa Type')} *</label>
            <select id="new-visa-type" class="form-control" required>
              <option value="TOURIST">${escapeHtml(t('visas.types.TOURIST') || 'Tourist')}</option>
              <option value="WORK">${escapeHtml(t('visas.types.WORK') || 'Work')}</option>
              <option value="STUDY">${escapeHtml(t('visas.types.STUDY') || 'Study')}</option>
              <option value="UMRAH_HAJJ">${escapeHtml(t('visas.types.UMRAH_HAJJ') || 'Umrah/Hajj')}</option>
              <option value="MEDICAL">${escapeHtml(t('visas.types.MEDICAL') || 'Medical')}</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label" for="new-visa-country">${escapeHtml(t('visas.form.country') || 'Country')} *</label>
            <input type="text" id="new-visa-country" class="form-control" placeholder="${escapeHtml(t('visas.form.countryPlaceholder') || 'e.g. KSA, UAE')}" required />
          </div>
        </div>

        <div class="form-grid-3">
          <div class="form-group">
            <label class="form-label" for="new-visa-price">${escapeHtml(t('visas.form.price') || 'Price')} *</label>
            <input type="number" id="new-visa-price" class="form-control tabular-nums" min="0" step="any" required />
          </div>
          <div class="form-group">
            <label class="form-label" for="new-visa-paidAmount">${escapeHtml(t('visas.form.paidAmount') || 'Collected Amount')}</label>
            <input type="number" id="new-visa-paidAmount" class="form-control tabular-nums" min="0" step="any" value="0" />
          </div>
          <div class="form-group">
            <label class="form-label" for="new-visa-currency">${escapeHtml(t('visas.form.currency') || 'Currency')}</label>
            <select id="new-visa-currency" class="form-control">
              <option value="EGP" selected>EGP (جنيه مصري)</option>
              <option value="USD">USD (دولار أمريكي)</option>
              <option value="EUR">EUR (يورو)</option>
              <option value="SAR">SAR (ريال سعودي)</option>
              <option value="AED">AED (درهم إماراتي)</option>
              <option value="QAR">QAR (ريال قطري)</option>
              <option value="KWD">KWD (دينار كويتي)</option>
            </select>
          </div>
        </div>

        <!-- Dynamic Remaining Calculation Banner -->
        <div class="p-sm d-flex items-center justify-between" style="background: var(--color-bg-secondary, #f8fafc); border-radius: var(--radius-md); border: 1px dashed var(--color-border-soft);">
          <span class="text-sm font-medium text-muted">${escapeHtml(t('visas.form.remainingAmount') || 'Remaining Balance')}:</span>
          <span id="new-visa-remaining-preview" class="tabular-nums font-bold" style="font-size: 15px; color: var(--color-warning, #d97706);">0 EGP</span>
        </div>

        <div class="form-grid-2">
          <div class="form-group">
            <label class="form-label" for="new-visa-status">${escapeHtml(t('visas.form.paymentStatus') || 'Payment Status')} *</label>
            <select id="new-visa-status" class="form-control" required>
              <option value="UNPAID">${escapeHtml(t('visas.payment.UNPAID') || 'UNPAID')}</option>
              <option value="PARTIAL">${escapeHtml(t('visas.payment.PARTIAL') || 'PARTIAL')}</option>
              <option value="PAID">${escapeHtml(t('visas.payment.PAID') || 'PAID')}</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label" for="new-visa-date">${escapeHtml(t('visas.form.submissionDate') || 'Submission Date')} *</label>
            <input type="datetime-local" id="new-visa-date" class="form-control ltr-field" value="${localIsoDate}" required />
          </div>
        </div>

        ${isAdmin ? `
        <div class="form-group">
          <label class="form-label" for="new-visa-costPrice">${escapeHtml(t('visas.form.costPrice') || 'Cost Price')}</label>
          <input type="number" id="new-visa-costPrice" class="form-control tabular-nums" min="0" step="any" />
        </div>
        ` : ''}

        <div class="form-group">
          <label class="form-label" for="new-visa-notes">${escapeHtml(t('visas.form.notes') || 'Notes')}</label>
          <textarea id="new-visa-notes" class="form-control" rows="2"></textarea>
        </div>

        <div id="new-visa-error-box" class="p-sm text-sm text-danger" style="display: none; background-color: rgba(239, 68, 68, 0.1); border-radius: var(--radius-md); border: 1px solid rgba(239, 68, 68, 0.3);"></div>
      </form>
    `,
    footerHtml: `
      <button type="button" class="btn btn-secondary" id="cancel-new-visa">${escapeHtml(t('common.cancel'))}</button>
      <button type="button" class="btn btn-primary" id="submit-new-visa">${escapeHtml(t('common.save'))}</button>
    `,
    onOpen: (modalEl) => {
      const cancelBtn = modalEl.querySelector('#cancel-new-visa');
      const submitBtn = modalEl.querySelector('#submit-new-visa');
      const errorBox = modalEl.querySelector('#new-visa-error-box');
      const priceInput = modalEl.querySelector('#new-visa-price');
      const paidInput = modalEl.querySelector('#new-visa-paidAmount');
      const currencySelect = modalEl.querySelector('#new-visa-currency');
      const statusSelect = modalEl.querySelector('#new-visa-status');
      const remainingPreview = modalEl.querySelector('#new-visa-remaining-preview');

      let userOverrodeStatus = false;
      if (statusSelect) {
        statusSelect.addEventListener('change', () => {
          userOverrodeStatus = true;
        });
      }

      const syncRemaining = () => {
        const p = Number(priceInput?.value) || 0;
        const pd = Number(paidInput?.value) || 0;
        const rem = Math.max(0, p - pd);
        const curr = currencySelect?.value || 'EGP';
        if (remainingPreview) {
          remainingPreview.textContent = formatCurrency(rem, curr);
          if (rem === 0 && p > 0) {
            remainingPreview.style.color = 'var(--color-success, #16a34a)';
          } else {
            remainingPreview.style.color = 'var(--color-warning, #d97706)';
          }
        }
        if (!userOverrodeStatus && statusSelect) {
          if (pd >= p && p > 0) {
            statusSelect.value = 'PAID';
          } else if (pd > 0) {
            statusSelect.value = 'PARTIAL';
          } else {
            statusSelect.value = 'UNPAID';
          }
        }
      };

      if (priceInput) priceInput.addEventListener('input', syncRemaining);
      if (paidInput) paidInput.addEventListener('input', syncRemaining);
      if (currencySelect) currencySelect.addEventListener('change', syncRemaining);

      if (cancelBtn) cancelBtn.addEventListener('click', closeModal);

      if (submitBtn) {
        submitBtn.addEventListener('click', async () => {
          const clientName = modalEl.querySelector('#new-visa-clientName').value.trim();
          const phone = modalEl.querySelector('#new-visa-phone').value.trim();
          const visaType = modalEl.querySelector('#new-visa-type').value;
          const country = modalEl.querySelector('#new-visa-country').value.trim();
          const submissionDate = modalEl.querySelector('#new-visa-date').value;
          const price = Number(modalEl.querySelector('#new-visa-price').value);
          const paidAmount = Number(modalEl.querySelector('#new-visa-paidAmount').value) || 0;
          const currency = modalEl.querySelector('#new-visa-currency')?.value || 'EGP';
          const paymentStatus = modalEl.querySelector('#new-visa-status').value;
          const notes = modalEl.querySelector('#new-visa-notes').value.trim();
          
          let costPrice = null;
          if (isAdmin) {
            const costVal = modalEl.querySelector('#new-visa-costPrice')?.value;
            if (costVal) costPrice = Number(costVal);
          }

          if (!clientName || !country || !submissionDate || isNaN(price)) {
            showToast(t('validation.requiredField') || 'Required fields missing', 'error');
            return;
          }

          submitBtn.disabled = true;
          if (errorBox) {
            errorBox.style.display = 'none';
            errorBox.textContent = '';
          }

          const result = await VisaService.createVisa({
            clientName,
            phone,
            visaType,
            country,
            submissionDate,
            price,
            paidAmount,
            costPrice,
            currency,
            paymentStatus,
            notes
          });

          submitBtn.disabled = false;

          if (!result.success) {
            const msg = result.error?.message || t('common.error');
            if (errorBox) {
              errorBox.textContent = msg;
              errorBox.style.display = 'block';
            }
            showToast(msg, 'error');
            return;
          }

          closeModal();
          showToast(t('visas.createdSuccessfully') || 'Visa created', 'success');
          if (onSuccess) onSuccess();
        });
      }
    }
  });
}

function openEditVisaModal(visa, onSuccess) {
  const currentUser = AuthService.getCurrentUser();
  const isAdmin = (currentUser?.role || '').toUpperCase() === 'ADMIN';

  let localIsoDate = '';
  if (visa.submissionDate) {
    const d = new Date(visa.submissionDate);
    if (!isNaN(d.getTime())) {
      localIsoDate = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    }
  }

  const initialPrice = Number(visa.price) || 0;
  const initialPaid = Number(visa.paidAmount) || 0;
  const initialRem = Math.max(0, initialPrice - initialPaid);

  openModal({
    title: t('visas.editVisaModalTitle') || 'Edit Visa',
    subtitle: t('visas.editVisaModalSubtitle') || 'Update visa details',
    contentHtml: `
      <form id="edit-visa-form" class="d-flex flex-column gap-md">
        <div class="form-grid-2">
          <div class="form-group">
            <label class="form-label" for="edit-visa-clientName">${escapeHtml(t('visas.form.clientName') || 'Client Name')} *</label>
            <input type="text" id="edit-visa-clientName" class="form-control" value="${escapeHtml(visa.clientName)}" required />
          </div>
          <div class="form-group">
            <label class="form-label" for="edit-visa-phone">${escapeHtml(t('visas.form.phone') || 'Phone')}</label>
            <input type="text" id="edit-visa-phone" class="form-control ltr-field" value="${escapeHtml(visa.phone || '')}" />
          </div>
        </div>

        <div class="form-grid-2">
          <div class="form-group">
            <label class="form-label" for="edit-visa-type">${escapeHtml(t('visas.form.visaType') || 'Visa Type')} *</label>
            <select id="edit-visa-type" class="form-control" required>
              <option value="TOURIST" ${visa.visaType === 'TOURIST' ? 'selected' : ''}>${escapeHtml(t('visas.types.TOURIST') || 'Tourist')}</option>
              <option value="WORK" ${visa.visaType === 'WORK' ? 'selected' : ''}>${escapeHtml(t('visas.types.WORK') || 'Work')}</option>
              <option value="STUDY" ${visa.visaType === 'STUDY' ? 'selected' : ''}>${escapeHtml(t('visas.types.STUDY') || 'Study')}</option>
              <option value="UMRAH_HAJJ" ${visa.visaType === 'UMRAH_HAJJ' ? 'selected' : ''}>${escapeHtml(t('visas.types.UMRAH_HAJJ') || 'Umrah/Hajj')}</option>
              <option value="MEDICAL" ${visa.visaType === 'MEDICAL' ? 'selected' : ''}>${escapeHtml(t('visas.types.MEDICAL') || 'Medical')}</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label" for="edit-visa-country">${escapeHtml(t('visas.form.country') || 'Country')} *</label>
            <input type="text" id="edit-visa-country" class="form-control" value="${escapeHtml(visa.country)}" required />
          </div>
        </div>

        <div class="form-grid-3">
          <div class="form-group">
            <label class="form-label" for="edit-visa-price">${escapeHtml(t('visas.form.price') || 'Price')} *</label>
            <input type="number" id="edit-visa-price" class="form-control tabular-nums" min="0" step="any" value="${escapeHtml(String(visa.price || ''))}" required />
          </div>
          <div class="form-group">
            <label class="form-label" for="edit-visa-paidAmount">${escapeHtml(t('visas.form.paidAmount') || 'Collected Amount')}</label>
            <input type="number" id="edit-visa-paidAmount" class="form-control tabular-nums" min="0" step="any" value="${escapeHtml(String(visa.paidAmount ?? 0))}" />
          </div>
          <div class="form-group">
            <label class="form-label" for="edit-visa-currency">${escapeHtml(t('visas.form.currency') || 'Currency')}</label>
            <select id="edit-visa-currency" class="form-control">
              <option value="EGP" ${visa.currency === 'EGP' ? 'selected' : ''}>EGP (جنيه مصري)</option>
              <option value="USD" ${visa.currency === 'USD' ? 'selected' : ''}>USD (دولار أمريكي)</option>
              <option value="EUR" ${visa.currency === 'EUR' ? 'selected' : ''}>EUR (يورو)</option>
              <option value="SAR" ${visa.currency === 'SAR' ? 'selected' : ''}>SAR (ريال سعودي)</option>
              <option value="AED" ${visa.currency === 'AED' ? 'selected' : ''}>AED (درهم إماراتي)</option>
              <option value="QAR" ${visa.currency === 'QAR' ? 'selected' : ''}>QAR (ريال قطري)</option>
              <option value="KWD" ${visa.currency === 'KWD' ? 'selected' : ''}>KWD (دينار كويتي)</option>
            </select>
          </div>
        </div>

        <!-- Dynamic Remaining Calculation Banner -->
        <div class="p-sm d-flex items-center justify-between" style="background: var(--color-bg-secondary, #f8fafc); border-radius: var(--radius-md); border: 1px dashed var(--color-border-soft);">
          <span class="text-sm font-medium text-muted">${escapeHtml(t('visas.form.remainingAmount') || 'Remaining Balance')}:</span>
          <span id="edit-visa-remaining-preview" class="tabular-nums font-bold" style="font-size: 15px; color: ${initialRem === 0 && initialPrice > 0 ? 'var(--color-success, #16a34a)' : 'var(--color-warning, #d97706)'};">${formatCurrency(initialRem, visa.currency || 'EGP')}</span>
        </div>

        <div class="form-grid-2">
          <div class="form-group">
            <label class="form-label" for="edit-visa-status">${escapeHtml(t('visas.form.paymentStatus') || 'Payment Status')} *</label>
            <select id="edit-visa-status" class="form-control" required>
              <option value="UNPAID" ${visa.paymentStatus === 'UNPAID' ? 'selected' : ''}>${escapeHtml(t('visas.payment.UNPAID') || 'UNPAID')}</option>
              <option value="PARTIAL" ${visa.paymentStatus === 'PARTIAL' ? 'selected' : ''}>${escapeHtml(t('visas.payment.PARTIAL') || 'PARTIAL')}</option>
              <option value="PAID" ${visa.paymentStatus === 'PAID' ? 'selected' : ''}>${escapeHtml(t('visas.payment.PAID') || 'PAID')}</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label" for="edit-visa-date">${escapeHtml(t('visas.form.submissionDate') || 'Submission Date')} *</label>
            <input type="datetime-local" id="edit-visa-date" class="form-control ltr-field" value="${escapeHtml(localIsoDate)}" required />
          </div>
        </div>

        ${isAdmin ? `
        <div class="form-group">
          <label class="form-label" for="edit-visa-costPrice">${escapeHtml(t('visas.form.costPrice') || 'Cost Price')}</label>
          <input type="number" id="edit-visa-costPrice" class="form-control tabular-nums" min="0" step="any" value="${escapeHtml(String(visa.costPrice || ''))}" />
        </div>
        ` : ''}

        <div class="form-group">
          <label class="form-label" for="edit-visa-notes">${escapeHtml(t('visas.form.notes') || 'Notes')}</label>
          <textarea id="edit-visa-notes" class="form-control" rows="2">${escapeHtml(visa.notes || '')}</textarea>
        </div>

        <div id="edit-visa-error-box" class="p-sm text-sm text-danger" style="display: none; background-color: rgba(239, 68, 68, 0.1); border-radius: var(--radius-md); border: 1px solid rgba(239, 68, 68, 0.3);"></div>
      </form>
    `,
    footerHtml: `
      <button type="button" class="btn btn-secondary" id="cancel-edit-visa">${escapeHtml(t('common.cancel'))}</button>
      <button type="button" class="btn btn-primary" id="submit-edit-visa">${escapeHtml(t('common.save'))}</button>
    `,
    onOpen: (modalEl) => {
      const cancelBtn = modalEl.querySelector('#cancel-edit-visa');
      const submitBtn = modalEl.querySelector('#submit-edit-visa');
      const errorBox = modalEl.querySelector('#edit-visa-error-box');
      const priceInput = modalEl.querySelector('#edit-visa-price');
      const paidInput = modalEl.querySelector('#edit-visa-paidAmount');
      const currencySelect = modalEl.querySelector('#edit-visa-currency');
      const statusSelect = modalEl.querySelector('#edit-visa-status');
      const remainingPreview = modalEl.querySelector('#edit-visa-remaining-preview');

      let userOverrodeStatus = false;
      if (statusSelect) {
        statusSelect.addEventListener('change', () => {
          userOverrodeStatus = true;
        });
      }

      const syncRemaining = () => {
        const p = Number(priceInput?.value) || 0;
        const pd = Number(paidInput?.value) || 0;
        const rem = Math.max(0, p - pd);
        const curr = currencySelect?.value || visa.currency || 'EGP';
        if (remainingPreview) {
          remainingPreview.textContent = formatCurrency(rem, curr);
          if (rem === 0 && p > 0) {
            remainingPreview.style.color = 'var(--color-success, #16a34a)';
          } else {
            remainingPreview.style.color = 'var(--color-warning, #d97706)';
          }
        }
        if (!userOverrodeStatus && statusSelect) {
          if (pd >= p && p > 0) {
            statusSelect.value = 'PAID';
          } else if (pd > 0) {
            statusSelect.value = 'PARTIAL';
          } else {
            statusSelect.value = 'UNPAID';
          }
        }
      };

      if (priceInput) priceInput.addEventListener('input', syncRemaining);
      if (paidInput) paidInput.addEventListener('input', syncRemaining);
      if (currencySelect) currencySelect.addEventListener('change', syncRemaining);

      if (cancelBtn) cancelBtn.addEventListener('click', closeModal);

      if (submitBtn) {
        submitBtn.addEventListener('click', async () => {
          const clientName = modalEl.querySelector('#edit-visa-clientName').value.trim();
          const phone = modalEl.querySelector('#edit-visa-phone').value.trim();
          const visaType = modalEl.querySelector('#edit-visa-type').value;
          const country = modalEl.querySelector('#edit-visa-country').value.trim();
          const submissionDate = modalEl.querySelector('#edit-visa-date').value;
          const price = Number(modalEl.querySelector('#edit-visa-price').value);
          const paidAmount = Number(modalEl.querySelector('#edit-visa-paidAmount').value) || 0;
          const currency = modalEl.querySelector('#edit-visa-currency')?.value || 'EGP';
          const paymentStatus = modalEl.querySelector('#edit-visa-status').value;
          const notes = modalEl.querySelector('#edit-visa-notes').value.trim();
          
          let costPrice = visa.costPrice;
          if (isAdmin) {
            const costVal = modalEl.querySelector('#edit-visa-costPrice')?.value;
            costPrice = costVal ? Number(costVal) : null;
          }

          if (!clientName || !country || !submissionDate || isNaN(price)) {
            showToast(t('validation.requiredField') || 'Required fields missing', 'error');
            return;
          }

          submitBtn.disabled = true;
          if (errorBox) {
            errorBox.style.display = 'none';
            errorBox.textContent = '';
          }

          const result = await VisaService.updateVisa(visa.id, {
            clientName,
            phone,
            visaType,
            country,
            submissionDate,
            price,
            paidAmount,
            costPrice,
            currency,
            paymentStatus,
            notes
          });

          submitBtn.disabled = false;

          if (!result.success) {
            const msg = result.error?.message || t('common.error');
            if (errorBox) {
              errorBox.textContent = msg;
              errorBox.style.display = 'block';
            }
            showToast(msg, 'error');
            return;
          }

          closeModal();
          showToast(t('visas.updatedSuccessfully') || 'Visa updated', 'success');
          if (onSuccess) onSuccess();
        });
      }
    }
  });
}

function openDeleteVisaModal(visa, onSuccess) {
  openModal({
    title: t('visas.deleteConfirmTitle') || 'Delete Visa',
    subtitle: `${escapeHtml(visa.clientName)} — ${escapeHtml(visa.visaType)}`,
    contentHtml: `
      <div class="d-flex flex-column gap-md">
        <p class="text-muted" style="margin: 0; line-height: 1.5;">
          ${escapeHtml(t('visas.deleteConfirmMessage') || 'Are you sure you want to delete this visa? This action cannot be undone.')}
        </p>
      </div>
    `,
    footerHtml: `
      <button type="button" class="btn btn-secondary" id="modal-cancel-delete-visa">${escapeHtml(t('common.cancel'))}</button>
      <button type="button" class="btn btn-danger" id="modal-confirm-delete-visa">${escapeHtml(t('common.delete'))}</button>
    `,
    onOpen: (modalEl) => {
      const cancelBtn = modalEl.querySelector('#modal-cancel-delete-visa');
      const confirmBtn = modalEl.querySelector('#modal-confirm-delete-visa');

      if (cancelBtn) cancelBtn.addEventListener('click', closeModal);

      if (confirmBtn) {
        confirmBtn.addEventListener('click', async () => {
          confirmBtn.disabled = true;
          const result = await VisaService.deleteVisa(visa.id);
          confirmBtn.disabled = false;

          if (!result.success) {
            showToast(result.error?.message || t('common.error'), 'error');
            return;
          }

          closeModal();
          showToast(t('visas.deletedSuccessfully') || 'Visa deleted', 'success');
          if (onSuccess) onSuccess();
        });
      }
    }
  });
}

export const VisasPage = {
  render() {
    const currentUser = AuthService.getCurrentUser();
    const isAdmin = (currentUser?.role || '').toUpperCase() === 'ADMIN';
    const isAgent = (currentUser?.role || '').toUpperCase() === 'AGENT';

    if (!isAdmin && !isAgent) {
      return `
        <div class="empty-state" style="padding: 64px 24px; text-align: center;">
          <h2>${escapeHtml(t('employees.accessRestricted') || 'Access Restricted')}</h2>
          <p class="text-muted">${escapeHtml(t('employees.adminOnlyMessage') || 'This page is only available to authorized staff.')}</p>
        </div>
      `;
    }

    const headerHtml = renderPageHeader({
      title: t('visas.title') || 'Visas',
      subtitle: t('visas.subtitle') || 'Manage visa applications',
      actionsHtml: `
        <button type="button" class="btn btn-primary" id="btn-add-visa">
          ${icons.plus('w-4 h-4')}
          <span>${escapeHtml(t('visas.addVisa') || 'Add Visa')}</span>
        </button>
      `
    });

    const rowsHtml = cachedVisas.map(visa => {
      const price = Number(visa.price) || 0;
      const paid = Number(visa.paidAmount) || 0;
      const remaining = visa.remainingAmount !== undefined ? Number(visa.remainingAmount) : Math.max(0, price - paid);
      const isPaidInFull = remaining <= 0 && price > 0;

      return `
      <tr class="clickable-row" data-href="/visas/${escapeHtml(visa.id)}" style="cursor: pointer;">
        <td>
          <div class="cell-main">${escapeHtml(visa.clientName)}</div>
          ${visa.phone ? `<div class="cell-sub ltr-data text-muted">${escapeHtml(visa.phone)}</div>` : ''}
        </td>
        <td>${getVisaTypeBadge(visa.visaType)}</td>
        <td><span class="text-sm">${escapeHtml(visa.country)}</span></td>
        <td>
          <div class="cell-main ltr-data">${formatDateTime(visa.submissionDate)}</div>
        </td>
        <td>
          <span class="badge badge-secondary ltr-data font-medium">${escapeHtml(visa.currency || 'EGP')}</span>
        </td>
        <td>
          <span class="tabular-nums font-bold" style="font-size: 15px;">
            ${formatCurrency(visa.price, visa.currency || 'EGP')}
          </span>
        </td>
        <td>
          <span class="tabular-nums font-medium text-success" style="font-size: 14px;">
            ${formatCurrency(paid, visa.currency || 'EGP')}
          </span>
        </td>
        <td>
          <span class="tabular-nums font-bold ${isPaidInFull ? 'text-muted' : 'text-warning'}" style="font-size: 14px;">
            ${formatCurrency(remaining, visa.currency || 'EGP')}
          </span>
        </td>
        <td>${getPaymentBadge(visa.paymentStatus)}</td>
        <td onclick="event.stopPropagation();">
          <div class="d-flex items-center gap-xs">
            <button type="button" class="btn btn-secondary btn-sm btn-edit-visa" data-visa-id="${escapeHtml(visa.id)}" title="${escapeHtml(t('common.edit') || 'Edit')}">
              ${icons.edit('w-4 h-4')}
            </button>
            ${isAdmin ? `
            <button type="button" class="btn btn-danger btn-sm btn-delete-visa" data-visa-id="${escapeHtml(visa.id)}" title="${escapeHtml(t('common.delete') || 'Delete')}">
              ${icons.trash('w-4 h-4')}
            </button>
            ` : ''}
          </div>
        </td>
      </tr>
    `;
    }).join('');

    return `
      ${headerHtml}

      <!-- Top KPI Summary Cards -->
      <div class="stat-card-grid mb-lg">
        <div class="stat-card">
          <span class="stat-card-label">${escapeHtml(t('visas.totalRevenue') || 'Total Revenue')}</span>
          <div class="stat-card-value tabular-nums text-primary">${formatCurrency(cachedTotals?.totalPrice || 0)}</div>
        </div>

        <div class="stat-card">
          <span class="stat-card-label">${escapeHtml(t('visas.totalPaid') || 'Total Collected')}</span>
          <div class="stat-card-value tabular-nums text-success">${formatCurrency(cachedTotals?.totalPaidAmount || 0)}</div>
        </div>

        <div class="stat-card">
          <span class="stat-card-label">${escapeHtml(t('visas.totalRemaining') || 'Total Remaining')}</span>
          <div class="stat-card-value tabular-nums text-warning">${formatCurrency(cachedTotals?.totalRemainingAmount || 0)}</div>
        </div>
        
        ${isAdmin ? `
        <div class="stat-card">
          <span class="stat-card-label">${escapeHtml(t('visas.totalCost') || 'Total Cost')}</span>
          <div class="stat-card-value tabular-nums text-danger">${formatCurrency(cachedTotals?.totalCostPrice || 0)}</div>
        </div>
        ` : ''}

        <div class="stat-card">
          <span class="stat-card-label">${escapeHtml(t('visas.totalVisas') || 'Total Visas')}</span>
          <div class="stat-card-value tabular-nums">${cachedTotals?.count || cachedPagination.total || 0}</div>
        </div>
      </div>

      <!-- Filters Toolbar -->
      <div class="card mb-lg" style="padding: 16px;">
        <div class="d-flex items-center justify-between gap-md flex-wrap">
          <div class="d-flex items-center gap-md flex-wrap" style="flex: 1;">
            <div style="min-width: 220px; flex: 1; max-width: 300px;">
              <input type="text" id="visa-filter-search" class="form-control" value="${escapeHtml(currentFilters.search)}" placeholder="${escapeHtml(t('visas.searchPlaceholder') || 'Search clients or phone...')}" />
            </div>

            <div style="min-width: 140px;">
              <select id="visa-filter-type" class="form-control">
                <option value="">${escapeHtml(t('visas.filterType') || 'All Types')}</option>
                <option value="TOURIST" ${currentFilters.visaType === 'TOURIST' ? 'selected' : ''}>${escapeHtml(t('visas.types.TOURIST') || 'Tourist')}</option>
                <option value="WORK" ${currentFilters.visaType === 'WORK' ? 'selected' : ''}>${escapeHtml(t('visas.types.WORK') || 'Work')}</option>
                <option value="STUDY" ${currentFilters.visaType === 'STUDY' ? 'selected' : ''}>${escapeHtml(t('visas.types.STUDY') || 'Study')}</option>
                <option value="UMRAH_HAJJ" ${currentFilters.visaType === 'UMRAH_HAJJ' ? 'selected' : ''}>${escapeHtml(t('visas.types.UMRAH_HAJJ') || 'Umrah/Hajj')}</option>
                <option value="MEDICAL" ${currentFilters.visaType === 'MEDICAL' ? 'selected' : ''}>${escapeHtml(t('visas.types.MEDICAL') || 'Medical')}</option>
              </select>
            </div>
            
            <div style="min-width: 140px;">
              <select id="visa-filter-status" class="form-control">
                <option value="">${escapeHtml(t('visas.filterStatus') || 'All Status')}</option>
                <option value="PAID" ${currentFilters.paymentStatus === 'PAID' ? 'selected' : ''}>${escapeHtml(t('visas.payment.PAID') || 'PAID')}</option>
                <option value="PARTIAL" ${currentFilters.paymentStatus === 'PARTIAL' ? 'selected' : ''}>${escapeHtml(t('visas.payment.PARTIAL') || 'PARTIAL')}</option>
                <option value="UNPAID" ${currentFilters.paymentStatus === 'UNPAID' ? 'selected' : ''}>${escapeHtml(t('visas.payment.UNPAID') || 'UNPAID')}</option>
              </select>
            </div>

            <div style="min-width: 130px;">
              <select id="visa-filter-currency" class="form-control">
                <option value="">${escapeHtml(t('visas.filterCurrency') || 'All Currencies')}</option>
                <option value="EGP" ${currentFilters.currency === 'EGP' ? 'selected' : ''}>EGP</option>
                <option value="USD" ${currentFilters.currency === 'USD' ? 'selected' : ''}>USD</option>
                <option value="EUR" ${currentFilters.currency === 'EUR' ? 'selected' : ''}>EUR</option>
                <option value="SAR" ${currentFilters.currency === 'SAR' ? 'selected' : ''}>SAR</option>
                <option value="AED" ${currentFilters.currency === 'AED' ? 'selected' : ''}>AED</option>
                <option value="QAR" ${currentFilters.currency === 'QAR' ? 'selected' : ''}>QAR</option>
                <option value="KWD" ${currentFilters.currency === 'KWD' ? 'selected' : ''}>KWD</option>
              </select>
            </div>

            <div class="d-flex items-center gap-xs">
              <input type="date" id="visa-filter-start-date" class="form-control" value="${escapeHtml(currentFilters.startDate || '')}" placeholder="${escapeHtml(t('common.fromDate'))}" />
              <span class="text-muted">—</span>
              <input type="date" id="visa-filter-end-date" class="form-control" value="${escapeHtml(currentFilters.endDate || '')}" placeholder="${escapeHtml(t('common.toDate'))}" />
            </div>

            <button type="button" class="btn btn-secondary btn-sm" id="visa-filter-clear">
              ${escapeHtml(t('common.clear') || 'Clear')}
            </button>
          </div>
        </div>
      </div>

      <!-- Visas Data Table -->
      <div class="card">
        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>${escapeHtml(t('visas.table.clientName') || 'Client')}</th>
                <th>${escapeHtml(t('visas.table.type') || 'Type')}</th>
                <th>${escapeHtml(t('visas.table.country') || 'Country')}</th>
                <th>${escapeHtml(t('visas.table.submissionDate') || 'Submission Date')}</th>
                <th>${escapeHtml(t('visas.table.currency') || 'Currency')}</th>
                <th>${escapeHtml(t('visas.table.price') || 'Price')}</th>
                <th>${escapeHtml(t('visas.table.paidAmount') || 'Collected')}</th>
                <th>${escapeHtml(t('visas.table.remainingAmount') || 'Remaining')}</th>
                <th>${escapeHtml(t('visas.table.status') || 'Status')}</th>
                <th>${escapeHtml(t('visas.table.actions') || 'Actions')}</th>
              </tr>
            </thead>
            <tbody id="visas-table-body">
              ${rowsHtml || `<tr><td colspan="10" class="text-center text-muted p-lg">${escapeHtml(t('visas.emptyState') || 'No visas found.')}</td></tr>`}
            </tbody>
          </table>
        </div>

        <!-- Pagination Controls -->
        ${cachedPagination.totalPages > 1 ? `
        <div class="card-footer d-flex items-center justify-between p-md" style="border-top: 1px solid var(--color-border-soft);">
          <span class="text-sm text-muted">
            ${escapeHtml(t('common.pageOf', 'Page {page} of {totalPages} ({total} records)', {
              page: cachedPagination.page,
              totalPages: cachedPagination.totalPages,
              total: cachedPagination.total
            }))}
          </span>
          <div class="d-flex gap-xs">
            <button type="button" class="btn btn-secondary btn-sm" id="visa-page-prev" ${cachedPagination.page <= 1 ? 'disabled' : ''}>‹ ${escapeHtml(t('common.prev'))}</button>
            <button type="button" class="btn btn-secondary btn-sm" id="visa-page-next" ${cachedPagination.page >= cachedPagination.totalPages ? 'disabled' : ''}>${escapeHtml(t('common.next'))} ›</button>
          </div>
        </div>
        ` : ''}
      </div>
    `;
  },

  async afterRender(container) {
    const fetchAndRefresh = async () => {
      const res = await VisaService.getVisas(currentFilters);
      if (res.success && Array.isArray(res.data)) {
        cachedVisas = res.data;
        if (res.pagination) cachedPagination = res.pagination;
        if (res.totals) cachedTotals = res.totals;
      }
      isInitialLoaded = true;
      container.innerHTML = VisasPage.render();
      VisasPage.afterRender(container);
    };

    if (!isInitialLoaded) {
      await fetchAndRefresh();
      return;
    }

    // Search with debounce
    const searchInput = container.querySelector('#visa-filter-search');
    let searchTimeout;
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
          currentFilters.search = e.target.value.trim();
          currentFilters.page = 1;
          fetchAndRefresh();
        }, 300);
      });
      // Focus the input and move cursor to end to avoid jumping on re-render
      setTimeout(() => {
        if (document.activeElement?.id === 'visa-filter-search') {
          // just keeping it focused might be hard with re-render, but debounce reduces issues
        }
      }, 0);
    }

    // Add Visa Button
    const addBtn = container.querySelector('#btn-add-visa');
    if (addBtn) {
      addBtn.addEventListener('click', () => {
        openAddVisaModal(() => {
          fetchAndRefresh();
        });
      });
    }

    // Type Filter Change
    const typeSelect = container.querySelector('#visa-filter-type');
    if (typeSelect) {
      typeSelect.addEventListener('change', (e) => {
        currentFilters.visaType = e.target.value;
        currentFilters.page = 1;
        fetchAndRefresh();
      });
    }

    // Status Filter Change
    const statusSelect = container.querySelector('#visa-filter-status');
    if (statusSelect) {
      statusSelect.addEventListener('change', (e) => {
        currentFilters.paymentStatus = e.target.value;
        currentFilters.page = 1;
        fetchAndRefresh();
      });
    }

    // Currency Filter Change
    const currencyFilterSelect = container.querySelector('#visa-filter-currency');
    if (currencyFilterSelect) {
      currencyFilterSelect.addEventListener('change', (e) => {
        currentFilters.currency = e.target.value;
        currentFilters.page = 1;
        fetchAndRefresh();
      });
    }

    // Date Filters
    const startDateInput = container.querySelector('#visa-filter-start-date');
    const endDateInput = container.querySelector('#visa-filter-end-date');
    const filterClearBtn = container.querySelector('#visa-filter-clear');

    if (startDateInput) {
      startDateInput.addEventListener('change', (e) => {
        currentFilters.startDate = e.target.value;
        currentFilters.page = 1;
        fetchAndRefresh();
      });
    }

    if (endDateInput) {
      endDateInput.addEventListener('change', (e) => {
        currentFilters.endDate = e.target.value;
        currentFilters.page = 1;
        fetchAndRefresh();
      });
    }

    if (filterClearBtn) {
      filterClearBtn.addEventListener('click', () => {
        currentFilters.search = '';
        currentFilters.visaType = '';
        currentFilters.paymentStatus = '';
        currentFilters.currency = '';
        currentFilters.startDate = '';
        currentFilters.endDate = '';
        currentFilters.page = 1;
        fetchAndRefresh();
      });
    }

    // Pagination
    const prevBtn = container.querySelector('#visa-page-prev');
    const nextBtn = container.querySelector('#visa-page-next');
    if (prevBtn) {
      prevBtn.addEventListener('click', () => {
        if (currentFilters.page > 1) {
          currentFilters.page--;
          fetchAndRefresh();
        }
      });
    }
    if (nextBtn) {
      nextBtn.addEventListener('click', () => {
        if (currentFilters.page < cachedPagination.totalPages) {
          currentFilters.page++;
          fetchAndRefresh();
        }
      });
    }

    // Edit Buttons
    container.querySelectorAll('.btn-edit-visa').forEach(btn => {
      btn.addEventListener('click', () => {
        const visaId = btn.dataset.visaId;
        const visa = cachedVisas.find(v => v.id === visaId);
        if (visa) {
          openEditVisaModal(visa, () => {
            fetchAndRefresh();
          });
        }
      });
    });

    // Delete Buttons (Admin only)
    container.querySelectorAll('.btn-delete-visa').forEach(btn => {
      btn.addEventListener('click', () => {
        const visaId = btn.dataset.visaId;
        const visa = cachedVisas.find(v => v.id === visaId);
        if (visa) {
          openDeleteVisaModal(visa, () => {
            fetchAndRefresh();
          });
        }
      });
    });

    // Row Click (Navigation)
    container.querySelectorAll('.clickable-row').forEach(row => {
      row.addEventListener('click', (e) => {
        // Only navigate if not clicking a button/action inside the row
        if (e.target.closest('button') || e.target.closest('.actions')) return;
        
        const href = row.dataset.href;
        if (href) {
          window.history.pushState(null, null, href);
          window.dispatchEvent(new PopStateEvent('popstate'));
        }
      });
    });
  }
};

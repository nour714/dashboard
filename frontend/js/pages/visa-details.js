import { VisaService } from '../services/visa-service.js';
import { AuthService } from '../services/auth-service.js';
import { icons } from '../components/icons.js';
import { renderPageHeader } from '../components/page-header.js';
import { openModal, closeModal } from '../components/modal.js';
import { showToast } from '../components/toast.js';
import { formatCurrency, formatDateTime } from '../utils/calculations.js';
import { escapeHtml } from '../utils/security.js';
import { t } from '../i18n/i18n.js';

function getVisaTypeBadge(visaType) {
  let bgClass = 'badge-primary';
  if (visaType === 'WORK') bgClass = 'badge-accent';
  else if (visaType === 'STUDY') bgClass = 'badge-info';
  else if (visaType === 'UMRAH_HAJJ') bgClass = 'badge-success';
  else if (visaType === 'MEDICAL') bgClass = 'badge-warning';
  
  const label = t('visas.types.' + visaType) || visaType || '—';
  return `<span class="badge ${bgClass}">${escapeHtml(label)}</span>`;
}

function getPaymentStatusBadge(status) {
  let bgClass = 'badge-danger';
  if (status === 'PAID') {
    bgClass = 'badge-success';
  } else if (status === 'PARTIAL') {
    bgClass = 'badge-warning';
  }
  const label = t('visas.paymentStatus.' + status) || t('visas.payment.' + status) || status;
  return `<span class="badge ${bgClass}">${escapeHtml(label)}</span>`;
}

function openEditVisaModal(visa, onSuccess) {
  const currentUser = AuthService.getCurrentUser();
  const isAdmin = (currentUser?.role || '').toUpperCase() === 'ADMIN';

  let localIsoDate = '';
  if (visa.submissionDate) {
    const d = new Date(visa.submissionDate);
    if (!isNaN(d.getTime())) {
      localIsoDate = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
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
        <div class="form-group">
          <label class="form-label">${escapeHtml(t('visas.table.clientName') || 'Client Name')} *</label>
          <input type="text" id="edit-visa-clientName" class="form-control" value="${escapeHtml(visa.clientName || '')}" required />
        </div>
        
        <div class="form-grid-2">
          <div class="form-group">
            <label class="form-label">${escapeHtml(t('visas.table.phone') || 'Phone')}</label>
            <input type="text" id="edit-visa-phone" class="form-control ltr-field" value="${escapeHtml(visa.phone || '')}" />
          </div>
          <div class="form-group">
            <label class="form-label">${escapeHtml(t('visas.table.visaType') || 'Visa Type')} *</label>
            <select id="edit-visa-type" class="form-control" required>
              <option value="TOURIST" ${visa.visaType === 'TOURIST' ? 'selected' : ''}>${escapeHtml(t('visas.types.TOURIST') || 'Tourist')}</option>
              <option value="WORK" ${visa.visaType === 'WORK' ? 'selected' : ''}>${escapeHtml(t('visas.types.WORK') || 'Work')}</option>
              <option value="STUDY" ${visa.visaType === 'STUDY' ? 'selected' : ''}>${escapeHtml(t('visas.types.STUDY') || 'Study')}</option>
              <option value="UMRAH_HAJJ" ${visa.visaType === 'UMRAH_HAJJ' ? 'selected' : ''}>${escapeHtml(t('visas.types.UMRAH_HAJJ') || 'Umrah / Hajj')}</option>
              <option value="MEDICAL" ${visa.visaType === 'MEDICAL' ? 'selected' : ''}>${escapeHtml(t('visas.types.MEDICAL') || 'Medical')}</option>
            </select>
          </div>
        </div>

        <div class="form-grid-2">
          <div class="form-group">
            <label class="form-label">${escapeHtml(t('visas.table.country') || 'Country')} *</label>
            <input type="text" id="edit-visa-country" class="form-control" value="${escapeHtml(visa.country || '')}" required />
          </div>
          <div class="form-group">
            <label class="form-label">${escapeHtml(t('visas.table.submissionDate') || 'Submission Date')}</label>
            <input type="date" id="edit-visa-date" class="form-control ltr-field" value="${escapeHtml(localIsoDate)}" />
          </div>
        </div>

        <div class="form-grid-2">
          <div class="form-group">
            <label class="form-label">${escapeHtml(t('visas.table.price') || 'Price')} *</label>
            <input type="number" id="edit-visa-price" class="form-control tabular-nums" min="0" step="any" value="${escapeHtml(String(visa.price ?? ''))}" required />
          </div>
          <div class="form-group">
            <label class="form-label">${escapeHtml(t('visas.table.paidAmount') || t('visas.form.paidAmount') || 'Collected Amount')}</label>
            <input type="number" id="edit-visa-paidAmount" class="form-control tabular-nums" min="0" step="any" value="${escapeHtml(String(visa.paidAmount ?? 0))}" />
          </div>
        </div>

        <!-- Dynamic Remaining Calculation Banner -->
        <div class="p-sm d-flex items-center justify-between" style="background: var(--color-bg-secondary, #f8fafc); border-radius: var(--radius-md); border: 1px dashed var(--color-border-soft);">
          <span class="text-sm font-medium text-muted">${escapeHtml(t('visas.table.remainingAmount') || t('visas.form.remainingAmount') || 'Remaining Balance')}:</span>
          <span id="edit-visa-remaining-preview" class="tabular-nums font-bold" style="font-size: 15px; color: ${initialRem === 0 && initialPrice > 0 ? 'var(--color-success, #16a34a)' : 'var(--color-warning, #d97706)'};">${formatCurrency(initialRem, visa.currency || 'EGP')}</span>
        </div>

        <div class="form-grid-2">
          <div class="form-group">
            <label class="form-label">${escapeHtml(t('visas.table.paymentStatus') || t('visas.form.paymentStatus') || 'Payment Status')} *</label>
            <select id="edit-visa-status" class="form-control" required>
              <option value="UNPAID" ${visa.paymentStatus === 'UNPAID' ? 'selected' : ''}>${escapeHtml(t('visas.payment.UNPAID') || 'UNPAID')}</option>
              <option value="PARTIAL" ${visa.paymentStatus === 'PARTIAL' ? 'selected' : ''}>${escapeHtml(t('visas.payment.PARTIAL') || 'PARTIAL')}</option>
              <option value="PAID" ${visa.paymentStatus === 'PAID' ? 'selected' : ''}>${escapeHtml(t('visas.payment.PAID') || 'PAID')}</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">${escapeHtml(t('visas.table.currency') || 'Currency')}</label>
            <select id="edit-visa-currency" class="form-control">
              <option value="EGP" ${visa.currency === 'EGP' ? 'selected' : ''}>EGP</option>
              <option value="USD" ${visa.currency === 'USD' ? 'selected' : ''}>USD</option>
              <option value="EUR" ${visa.currency === 'EUR' ? 'selected' : ''}>EUR</option>
              <option value="SAR" ${visa.currency === 'SAR' ? 'selected' : ''}>SAR</option>
            </select>
          </div>
        </div>

        ${isAdmin ? `
        <div class="form-group">
          <label class="form-label">${escapeHtml(t('visas.table.costPrice') || 'Cost Price')}</label>
          <input type="number" id="edit-visa-costPrice" class="form-control tabular-nums" min="0" step="any" value="${escapeHtml(String(visa.costPrice ?? ''))}" />
        </div>
        ` : ''}

        <div class="form-group">
          <label class="form-label">${escapeHtml(t('visas.table.notes') || 'Notes')}</label>
          <textarea id="edit-visa-notes" class="form-control" rows="3">${escapeHtml(visa.notes || '')}</textarea>
        </div>

        <div id="edit-visa-error-box" class="p-sm text-sm text-danger" style="display: none; background-color: rgba(239, 68, 68, 0.1); border-radius: var(--radius-md); border: 1px solid rgba(239, 68, 68, 0.3);"></div>
      </form>
    `,
    footerHtml: `
      <button type="button" class="btn btn-secondary" id="cancel-edit-visa">${escapeHtml(t('common.cancel') || 'Cancel')}</button>
      <button type="button" class="btn btn-primary" id="submit-edit-visa">${escapeHtml(t('common.save') || 'Save')}</button>
    `,
    onOpen: (modalEl) => {
      const cancelBtn = modalEl.querySelector('#cancel-edit-visa');
      const submitBtn = modalEl.querySelector('#submit-edit-visa');
      const errorBox = modalEl.querySelector('#edit-visa-error-box');
      const priceInput = modalEl.querySelector('#edit-visa-price');
      const paidInput = modalEl.querySelector('#edit-visa-paidAmount');
      const statusSelect = modalEl.querySelector('#edit-visa-status');
      const currencySelect = modalEl.querySelector('#edit-visa-currency');
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
          const visaType = modalEl.querySelector('#edit-visa-type').value.trim();
          const country = modalEl.querySelector('#edit-visa-country').value.trim();
          const submissionDate = modalEl.querySelector('#edit-visa-date').value || null;
          const price = Number(modalEl.querySelector('#edit-visa-price').value);
          const paidAmount = Number(modalEl.querySelector('#edit-visa-paidAmount')?.value) || 0;
          const paymentStatus = modalEl.querySelector('#edit-visa-status')?.value;
          const currency = modalEl.querySelector('#edit-visa-currency').value || 'EGP';
          const notes = modalEl.querySelector('#edit-visa-notes').value.trim();

          let costPrice = visa.costPrice;
          if (isAdmin) {
            const costPriceRaw = modalEl.querySelector('#edit-visa-costPrice')?.value;
            costPrice = costPriceRaw ? Number(costPriceRaw) : null;
          }

          if (!clientName || !visaType || !country || isNaN(price)) {
            showToast(t('validation.requiredField') || 'Please fill required fields', 'error');
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
            paymentStatus,
            costPrice,
            currency,
            notes
          });

          submitBtn.disabled = false;

          if (!result.success) {
            const msg = result.error?.message || t('common.error') || 'Error occurred';
            if (errorBox) {
              errorBox.textContent = msg;
              errorBox.style.display = 'block';
            }
            showToast(msg, 'error');
            return;
          }

          closeModal();
          showToast(t('visas.updatedSuccessfully') || 'Visa updated successfully', 'success');
          if (onSuccess) onSuccess();
        });
      }
    }
  });
}

function openDeleteVisaModal(visa, onSuccess) {
  openModal({
    title: t('visas.deleteConfirmTitle') || 'Delete Visa',
    subtitle: `${escapeHtml(visa.clientName)} — ${escapeHtml(visa.country)} (${escapeHtml(visa.visaType)})`,
    contentHtml: `
      <div class="d-flex flex-column gap-md">
        <p class="text-muted" style="margin: 0; line-height: 1.5;">
          ${escapeHtml(t('visas.deleteConfirmMessage') || 'Are you sure you want to delete this visa? This action cannot be undone.')}
        </p>
      </div>
    `,
    footerHtml: `
      <button type="button" class="btn btn-secondary" id="modal-cancel-delete">${escapeHtml(t('common.cancel') || 'Cancel')}</button>
      <button type="button" class="btn btn-danger" id="modal-confirm-delete">${escapeHtml(t('common.delete') || 'Delete')}</button>
    `,
    onOpen: (modalEl) => {
      const cancelBtn = modalEl.querySelector('#modal-cancel-delete');
      const confirmBtn = modalEl.querySelector('#modal-confirm-delete');

      if (cancelBtn) cancelBtn.addEventListener('click', closeModal);

      if (confirmBtn) {
        confirmBtn.addEventListener('click', async () => {
          confirmBtn.disabled = true;
          const result = await VisaService.deleteVisa(visa.id);
          confirmBtn.disabled = false;

          if (!result.success) {
            showToast(result.error?.message || t('common.error') || 'Error occurred', 'error');
            return;
          }

          closeModal();
          showToast(t('visas.deletedSuccessfully') || 'Visa deleted successfully', 'success');
          if (onSuccess) onSuccess();
        });
      }
    }
  });
}

export const VisaDetailsPage = {
  render(params) {
    return `<div id="visa-details-wrapper" class="p-lg">
      <div class="text-center text-muted p-lg">
        <div style="display: inline-block; width: 24px; height: 24px; border: 2px solid var(--color-primary); border-radius: 50%; border-top-color: transparent; animation: spin 1s linear infinite;"></div>
        <div class="mt-sm">${escapeHtml(t('common.loading') || 'Loading...')}</div>
      </div>
    </div>`;
  },
  async afterRender(container, params) {
    const visaId = params.id;
    const res = await VisaService.getVisaById(visaId);
    
    const wrapper = container.querySelector('#visa-details-wrapper') || container;

    if (!res.success || !res.data) {
      wrapper.innerHTML = `
        <div class="empty-state" style="margin-top: 60px;">
          <div class="empty-state-title">${escapeHtml(t('visas.notFound') || 'Visa Not Found')}</div>
          <p class="empty-state-desc">${escapeHtml(t('visas.notFoundDesc') || 'The requested visa could not be found.')}</p>
          <a href="/visas" class="btn btn-primary" data-link>${escapeHtml(t('visas.backToVisas') || 'Back to Visas')}</a>
        </div>
      `;
      return;
    }

    const visa = res.data;
    const currentUser = AuthService.getCurrentUser();
    const isAdmin = (currentUser?.role || '').toUpperCase() === 'ADMIN';
    const isAgent = (currentUser?.role || '').toUpperCase() === 'AGENT';

    const renderContent = () => {
      const isPaid = visa.paymentStatus === 'PAID';
      
      const togglePaymentLabel = isPaid 
        ? (t('visas.markAsUnpaid') || 'Mark as Unpaid') 
        : (t('visas.markAsPaid') || 'Mark as Paid');
      
      const headerHtml = renderPageHeader({
        title: escapeHtml(visa.clientName),
        subtitle: `${escapeHtml(visa.country)} - ${escapeHtml(visa.visaType)}`,
        actionsHtml: `
          <div class="d-flex items-center gap-sm flex-wrap">
            ${(isAdmin || isAgent) ? `
              <button type="button" class="btn btn-secondary btn-sm" id="btn-edit-visa">
                ${icons.edit('w-4 h-4')}
                <span>${escapeHtml(t('common.edit') || 'Edit')}</span>
              </button>
              <button type="button" class="btn ${isPaid ? 'btn-secondary' : 'btn-primary'} btn-sm" id="btn-toggle-payment">
                <span>${escapeHtml(togglePaymentLabel)}</span>
              </button>
            ` : ''}
            ${isAdmin ? `
              <button type="button" class="btn btn-danger btn-sm" id="btn-delete-visa">
                ${icons.trash('w-4 h-4')}
                <span>${escapeHtml(t('common.delete') || 'Delete')}</span>
              </button>
            ` : ''}
          </div>
        `
      });

      const profit = isAdmin && visa.price != null && visa.costPrice != null 
        ? visa.price - visa.costPrice 
        : null;

      wrapper.innerHTML = `
        <nav class="breadcrumbs mb-md">
          <a href="/visas" data-link>${escapeHtml(t('visas.details.breadcrumb') || 'Visas')}</a>
          <span class="breadcrumb-sep">/</span>
          <span>${escapeHtml(t('visas.details.title') || 'Visa Details')}</span>
        </nav>

        ${headerHtml}

        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 24px; margin-bottom: 24px;">
          <!-- Client Info Card -->
          <div class="card">
            <div class="card-header">
              <h3 style="margin: 0; font-size: 16px;">${escapeHtml(t('visas.details.clientInfo') || 'Client Information')}</h3>
            </div>
            <div class="card-body p-md d-flex flex-column gap-md">
              <div class="detail-row d-flex justify-between items-center" style="padding-bottom: 12px; border-bottom: 1px solid var(--color-border-soft);">
                <span class="detail-label text-muted">${escapeHtml(t('visas.table.clientName') || 'Client Name')}</span>
                <span class="detail-value font-medium">${escapeHtml(visa.clientName)}</span>
              </div>
              <div class="detail-row d-flex justify-between items-center">
                <span class="detail-label text-muted">${escapeHtml(t('visas.table.phone') || 'Phone')}</span>
                <span class="detail-value ltr-data">${escapeHtml(visa.phone || '—')}</span>
              </div>
            </div>
          </div>

          <!-- Visa Info Card -->
          <div class="card">
            <div class="card-header">
              <h3 style="margin: 0; font-size: 16px;">${escapeHtml(t('visas.details.visaInfo') || 'Visa Information')}</h3>
            </div>
            <div class="card-body p-md d-flex flex-column gap-md">
              <div class="detail-row d-flex justify-between items-center" style="padding-bottom: 12px; border-bottom: 1px solid var(--color-border-soft);">
                <span class="detail-label text-muted">${escapeHtml(t('visas.table.visaType') || 'Visa Type')}</span>
                <span class="detail-value">${getVisaTypeBadge(visa.visaType)}</span>
              </div>
              <div class="detail-row d-flex justify-between items-center" style="padding-bottom: 12px; border-bottom: 1px solid var(--color-border-soft);">
                <span class="detail-label text-muted">${escapeHtml(t('visas.table.country') || 'Country')}</span>
                <span class="detail-value font-medium">${escapeHtml(visa.country)}</span>
              </div>
              <div class="detail-row d-flex justify-between items-center" style="padding-bottom: 12px; border-bottom: 1px solid var(--color-border-soft);">
                <span class="detail-label text-muted">${escapeHtml(t('visas.table.submissionDate') || 'Submission Date')}</span>
                <span class="detail-value ltr-data">${visa.submissionDate ? formatDateTime(visa.submissionDate) : '—'}</span>
              </div>
              <div class="detail-row d-flex flex-column gap-xs">
                <span class="detail-label text-muted">${escapeHtml(t('visas.table.notes') || 'Notes')}</span>
                <span class="detail-value" style="white-space: pre-wrap; line-height: 1.5;">${escapeHtml(visa.notes || '—')}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Financial Info Card -->
        <div class="card mb-lg">
          <div class="card-header">
            <h3 style="margin: 0; font-size: 16px;">${escapeHtml(t('visas.details.financialInfo') || 'Financial Information')}</h3>
          </div>
          <div class="card-body p-md d-flex flex-column gap-md">
            <div class="detail-row d-flex justify-between items-center" style="padding-bottom: 12px; border-bottom: 1px solid var(--color-border-soft);">
              <span class="detail-label text-muted">${escapeHtml(t('visas.table.paymentStatus') || 'Payment Status')}</span>
              <span class="detail-value">${getPaymentStatusBadge(visa.paymentStatus)}</span>
            </div>
            <div class="detail-row d-flex justify-between items-center" style="padding-bottom: 12px; border-bottom: 1px solid var(--color-border-soft);">
              <span class="detail-label text-muted">${escapeHtml(t('visas.table.price') || 'Price (Client)')}</span>
              <span class="detail-value tabular-nums font-bold" style="font-size: 15px;">${formatCurrency(visa.price, visa.currency || 'EGP')}</span>
            </div>
            <div class="detail-row d-flex justify-between items-center" style="padding-bottom: 12px; border-bottom: 1px solid var(--color-border-soft);">
              <span class="detail-label text-muted">${escapeHtml(t('visas.table.paidAmount') || 'Collected Amount')}</span>
              <span class="detail-value tabular-nums font-bold text-success" style="font-size: 15px;">${formatCurrency(visa.paidAmount ?? 0, visa.currency || 'EGP')}</span>
            </div>
            <div class="detail-row d-flex justify-between items-center" style="padding-bottom: 12px; border-bottom: 1px solid var(--color-border-soft);">
              <span class="detail-label text-muted">${escapeHtml(t('visas.table.remainingAmount') || 'Remaining Balance')}</span>
              <span class="detail-value tabular-nums font-bold ${(visa.remainingAmount ?? 0) > 0 ? 'text-warning' : 'text-muted'}" style="font-size: 15px;">${formatCurrency(visa.remainingAmount ?? 0, visa.currency || 'EGP')}</span>
            </div>
            ${isAdmin ? `
              <div class="detail-row d-flex justify-between items-center" style="padding-bottom: 12px; border-bottom: 1px solid var(--color-border-soft);">
                <span class="detail-label text-muted">${escapeHtml(t('visas.table.costPrice') || 'Cost Price')}</span>
                <span class="detail-value tabular-nums">${visa.costPrice != null ? formatCurrency(visa.costPrice, visa.currency || 'EGP') : '—'}</span>
              </div>
              <div class="detail-row d-flex justify-between items-center" style="padding-bottom: 12px; border-bottom: 1px solid var(--color-border-soft);">
                <span class="detail-label text-muted">${escapeHtml(t('visas.details.profit') || 'Profit')}</span>
                <span class="detail-value tabular-nums font-bold text-accent">${profit != null ? formatCurrency(profit, visa.currency || 'EGP') : '—'}</span>
              </div>
            ` : ''}
            <div class="detail-row d-flex justify-between items-center" style="padding-bottom: 12px; border-bottom: 1px solid var(--color-border-soft);">
              <span class="detail-label text-muted">${escapeHtml(t('visas.table.createdBy') || 'Created By')}</span>
              <span class="detail-value">${escapeHtml(visa.createdBy || 'Staff')}</span>
            </div>
            <div class="detail-row d-flex justify-between items-center">
              <span class="detail-label text-muted">${escapeHtml(t('visas.table.createdAt') || 'Created At')}</span>
              <span class="detail-value ltr-data">${formatDateTime(visa.createdAt)}</span>
            </div>
          </div>
        </div>
      `;

      // Bind actions
      const btnEdit = wrapper.querySelector('#btn-edit-visa');
      if (btnEdit) {
        btnEdit.addEventListener('click', () => {
          openEditVisaModal(visa, async () => {
            // refresh data
            const fresh = await VisaService.getVisaById(visaId);
            if (fresh.success && fresh.data) {
              Object.assign(visa, fresh.data);
              renderContent();
            }
          });
        });
      }

      const btnTogglePayment = wrapper.querySelector('#btn-toggle-payment');
      if (btnTogglePayment) {
        btnTogglePayment.addEventListener('click', async () => {
          btnTogglePayment.disabled = true;
          const newStatus = visa.paymentStatus === 'PAID' ? 'UNPAID' : 'PAID';
          const newPaidAmount = newStatus === 'PAID' ? Number(visa.price || 0) : 0;
          const updateRes = await VisaService.updateVisa(visaId, { 
            paymentStatus: newStatus,
            paidAmount: newPaidAmount
          });
          if (updateRes.success) {
            showToast(t('visas.paymentUpdated') || t('visas.paymentStatusUpdated') || 'Payment status updated', 'success');
            const fresh = await VisaService.getVisaById(visaId);
            if (fresh.success && fresh.data) {
              Object.assign(visa, fresh.data);
              renderContent();
            }
          } else {
            btnTogglePayment.disabled = false;
            showToast(updateRes.error?.message || t('common.error') || 'Error occurred', 'error');
          }
        });
      }

      const btnDelete = wrapper.querySelector('#btn-delete-visa');
      if (btnDelete) {
        btnDelete.addEventListener('click', () => {
          openDeleteVisaModal(visa, () => {
            window.history.pushState({}, '', '/visas');
            window.dispatchEvent(new Event('popstate'));
          });
        });
      }
    };

    renderContent();
  }
};

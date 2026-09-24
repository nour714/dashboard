/**
 * AfricaTravel — Bulk Ticket Import Modal Component
 *
 * Handles file selection (Excel .xlsx/.xls/.csv and PDF documents),
 * downloadable sample template, real-time animated progress bar,
 * and detailed import completion report with duplicates & error breakdown.
 */

import { openModal, closeModal } from './modal.js';
import { icons } from './icons.js';
import { TicketService } from '../services/ticket-service.js';
import { store } from '../state/store.js';
import { showToast } from './toast.js';
import { t } from '../i18n/i18n.js';
import { escapeHtml } from '../utils/security.js';

export function openBulkImportModal({ onSuccess } = {}) {
  let selectedFiles = [];
  let isProcessing = false;

  function renderFilesListHtml(files) {
    if (files.length === 0) return '';
    return `
      <div class="bulk-selected-files" style="margin-top: 14px; max-height: 160px; overflow-y: auto;">
        <div class="text-xs font-semibold text-muted" style="margin-bottom: 6px;">
          ${escapeHtml(t('tickets.bulkModal.selectedFiles') || 'Selected Files')} (${files.length})
        </div>
        <div class="d-flex flex-column gap-xs">
          ${files.map((file, idx) => `
            <div class="d-flex items-center justify-between p-xs rounded border text-sm" style="background: var(--color-surface-soft); border-color: var(--color-border);">
              <div class="d-flex items-center gap-xs overflow-hidden" style="min-width: 0;">
                ${icons.file ? icons.file('w-4 h-4 text-primary shrink-0') : icons.download('w-4 h-4 text-primary shrink-0')}
                <span class="truncate font-medium">${escapeHtml(file.name)}</span>
                <span class="text-xs text-muted">(${Math.round(file.size / 1024)} KB)</span>
              </div>
              <button type="button" class="btn btn-ghost btn-xs text-danger remove-file-btn" data-index="${idx}" aria-label="Remove file">
                ${icons.close('w-3.5 h-3.5')}
              </button>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  function renderReportHtml(report) {
    const totalProcessed = report.totalProcessed || 0;
    const totalImported = report.totalImported || 0;
    const totalDuplicates = report.totalDuplicates || 0;
    const totalErrors = report.totalErrors || 0;
    const duplicates = Array.isArray(report.duplicates) ? report.duplicates : [];
    const errors = Array.isArray(report.errors) ? report.errors : [];
    const imported = Array.isArray(report.imported) ? report.imported : [];

    return `
      <div class="bulk-report-container d-flex flex-column gap-md">
        <!-- KPI Summary row -->
        <div class="grid grid-cols-3 gap-sm text-center">
          <div class="p-sm rounded border" style="background: var(--color-success-bg); border-color: var(--color-success-border);">
            <div class="text-xs font-semibold text-success">${escapeHtml(t('tickets.bulkModal.totalImported') || 'Successfully Imported')}</div>
            <div class="text-xl font-bold text-success">${totalImported}</div>
          </div>
          <div class="p-sm rounded border" style="background: var(--color-warning-bg); border-color: var(--color-warning-border);">
            <div class="text-xs font-semibold text-warning">${escapeHtml(t('tickets.bulkModal.totalDuplicates') || 'Skipped Duplicates')}</div>
            <div class="text-xl font-bold text-warning">${totalDuplicates}</div>
          </div>
          <div class="p-sm rounded border" style="background: var(--color-surface-soft); border-color: var(--color-border);">
            <div class="text-xs font-semibold text-muted">${escapeHtml(t('tickets.bulkModal.totalProcessed') || 'Total')}</div>
            <div class="text-xl font-bold">${totalProcessed}</div>
          </div>
        </div>

        ${totalErrors > 0 ? `
          <div class="p-xs rounded border text-center text-sm font-semibold text-danger" style="background: var(--color-danger-bg); border-color: var(--color-danger-border);">
            ${escapeHtml(t('tickets.bulkModal.totalErrors') || 'Errors')}: ${totalErrors}
          </div>
        ` : ''}

        <!-- Successfully Imported list summary -->
        ${imported.length > 0 ? `
          <div class="rounded border p-sm" style="background: var(--color-surface); max-height: 150px; overflow-y: auto;">
            <div class="text-xs font-semibold text-success" style="margin-bottom: 6px;">
              ✓ ${escapeHtml(t('tickets.bulkModal.totalImported') || 'Successfully Imported')} (${imported.length})
            </div>
            <div class="d-flex flex-column gap-xs text-xs">
              ${imported.slice(0, 15).map(item => `
                <div class="d-flex items-center justify-between border-b pb-xs">
                  <span class="font-medium">${escapeHtml(item.passengerName || 'Guest')}</span>
                  <span class="text-muted ltr-data">${escapeHtml(item.origin || '')} ✈ ${escapeHtml(item.destination || '')} | PNR: <strong>${escapeHtml(item.pnr || '-')}</strong></span>
                </div>
              `).join('')}
              ${imported.length > 15 ? `<div class="text-muted text-center pt-xs">+ ${imported.length - 15} more...</div>` : ''}
            </div>
          </div>
        ` : ''}

        <!-- Skipped Duplicates breakdown -->
        ${duplicates.length > 0 ? `
          <div class="rounded border p-sm" style="background: var(--color-surface-soft); max-height: 150px; overflow-y: auto; border-color: var(--color-warning-border);">
            <div class="text-xs font-semibold text-warning" style="margin-bottom: 6px;">
              ⚠ ${escapeHtml(t('tickets.bulkModal.duplicatesTitle') || 'Skipped Duplicates')} (${duplicates.length})
            </div>
            <div class="d-flex flex-column gap-xs text-xs">
              ${duplicates.map(d => `
                <div class="d-flex items-center justify-between border-b pb-xs">
                  <span class="font-medium">${escapeHtml(d.passengerName || '-')}</span>
                  <span class="text-muted ltr-data">PNR: <strong>${escapeHtml(d.pnr || '-')}</strong> | Tkt: ${escapeHtml(d.ticketNumber || '-')}</span>
                </div>
              `).join('')}
            </div>
          </div>
        ` : ''}

        <!-- Errors breakdown -->
        ${errors.length > 0 ? `
          <div class="rounded border p-sm" style="background: var(--color-surface-soft); max-height: 130px; overflow-y: auto; border-color: var(--color-danger-border);">
            <div class="text-xs font-semibold text-danger" style="margin-bottom: 6px;">
              ✕ ${escapeHtml(t('tickets.bulkModal.errorsTitle') || 'Failed Items')} (${errors.length})
            </div>
            <div class="d-flex flex-column gap-xs text-xs">
              ${errors.map(e => `
                <div class="d-flex flex-column border-b pb-xs">
                  <span class="font-medium text-danger">${escapeHtml(e.error || 'Failed')}</span>
                  <span class="text-muted text-xs">${escapeHtml(e.fileName || '')} — ${escapeHtml(e.passengerName || '-')} (${escapeHtml(e.pnr || e.ticketNumber || '-')})</span>
                </div>
              `).join('')}
            </div>
          </div>
        ` : ''}
      </div>
    `;
  }

  const contentHtml = `
    <div id="bulk-import-root">
      <!-- Section 1: Upload Form & Dropzone -->
      <div id="bulk-upload-section">
        <input type="file" id="bulk-modal-file-input" accept=".xlsx,.xls,.csv,.pdf" multiple style="display: none;" />

        <div
          id="bulk-dropzone"
          tabindex="0"
          role="button"
          aria-label="Upload files"
          class="border-dashed rounded-lg p-lg text-center cursor-pointer transition-colors"
          style="border: 2px dashed var(--color-border); background: var(--color-surface-soft); border-radius: var(--radius-lg); padding: 28px 16px; cursor: pointer;"
        >
          <div class="d-flex flex-column items-center gap-xs">
            <div style="width: 44px; height: 44px; border-radius: 50%; background: var(--color-surface); display: flex; align-items: center; justify-content: center; box-shadow: var(--shadow-sm); margin-bottom: 4px;">
              ${icons.upload('w-6 h-6 text-accent')}
            </div>
            <div class="font-semibold text-sm" style="color: var(--color-text);">
              ${escapeHtml(t('tickets.bulkModal.dropTitle') || 'Drag & drop your files here, or click to browse')}
            </div>
            <div class="text-xs text-muted" style="max-width: 380px;">
              ${escapeHtml(t('tickets.bulkModal.dropHint') || 'Supports Excel (.xlsx, .xls, .csv) and PDF documents (up to 50 files)')}
            </div>
          </div>
        </div>

        <!-- Download template button -->
        <div class="d-flex items-center justify-between" style="margin-top: 12px;">
          <button type="button" class="btn btn-ghost btn-sm text-primary d-flex items-center gap-xs" id="bulk-template-download-btn">
            ${icons.download('w-4 h-4')}
            <span>${escapeHtml(t('tickets.bulkModal.downloadTemplate') || 'Download Excel Template')}</span>
          </button>
          <span class="text-xs text-muted" id="bulk-files-count-badge"></span>
        </div>

        <!-- Container for dynamically selected files preview -->
        <div id="bulk-selected-files-container"></div>
      </div>

      <!-- Section 2: Real-time Progress Bar (hidden initially) -->
      <div id="bulk-progress-section" style="display: none; padding: 24px 8px;">
        <div class="d-flex flex-column gap-sm">
          <div class="d-flex items-center justify-between">
            <span class="font-semibold text-sm" id="bulk-progress-status">${escapeHtml(t('tickets.bulkModal.processing') || 'Processing tickets...')}</span>
            <span class="font-bold text-sm text-accent" id="bulk-progress-percent">0%</span>
          </div>
          <div style="width: 100%; height: 10px; background: var(--color-surface-container-high); border-radius: 999px; overflow: hidden;">
            <div
              id="bulk-progress-bar-fill"
              style="width: 0%; height: 100%; background: linear-gradient(90deg, var(--color-accent) 0%, var(--color-accent-strong) 100%); transition: width 0.3s ease; border-radius: 999px;"
            ></div>
          </div>
          <div class="text-xs text-muted text-center" id="bulk-progress-detail">
            ${escapeHtml(t('tickets.bulkModal.analyzing') || 'Analyzing files and extracting tickets...')}
          </div>
        </div>
      </div>

      <!-- Section 3: Summary Report (hidden initially) -->
      <div id="bulk-report-section" style="display: none;"></div>
    </div>
  `;

  const footerHtml = `
    <div class="d-flex items-center justify-between w-full" id="bulk-modal-footer">
      <button type="button" class="btn btn-secondary" data-modal-close id="bulk-cancel-btn">
        ${escapeHtml(t('common.cancel') || 'Cancel')}
      </button>
      <button type="button" class="btn btn-primary d-flex items-center gap-xs" id="bulk-start-import-btn" disabled>
        ${icons.upload('w-4 h-4')}
        <span>${escapeHtml(t('tickets.bulkModal.startImport') || 'Start Import')}</span>
      </button>
    </div>
  `;

  openModal({
    title: t('tickets.bulkModal.title') || 'Bulk Ticket Upload',
    subtitle: t('tickets.bulkModal.subtitle') || 'Upload Excel or PDF ticket documents to import tickets directly.',
    contentHtml,
    footerHtml,
    maxWidth: '620px',
    onOpen: (modalEl) => {
      const dropzone = modalEl.querySelector('#bulk-dropzone');
      const fileInput = modalEl.querySelector('#bulk-modal-file-input');
      const templateBtn = modalEl.querySelector('#bulk-template-download-btn');
      const filesContainer = modalEl.querySelector('#bulk-selected-files-container');
      const countBadge = modalEl.querySelector('#bulk-files-count-badge');
      const startBtn = modalEl.querySelector('#bulk-start-import-btn');
      const cancelBtn = modalEl.querySelector('#bulk-cancel-btn');
      const footer = modalEl.querySelector('#bulk-modal-footer');

      const uploadSection = modalEl.querySelector('#bulk-upload-section');
      const progressSection = modalEl.querySelector('#bulk-progress-section');
      const reportSection = modalEl.querySelector('#bulk-report-section');

      const progressStatus = modalEl.querySelector('#bulk-progress-status');
      const progressPercent = modalEl.querySelector('#bulk-progress-percent');
      const progressBarFill = modalEl.querySelector('#bulk-progress-bar-fill');
      const progressDetail = modalEl.querySelector('#bulk-progress-detail');

      function updateSelectedFilesView() {
        filesContainer.innerHTML = renderFilesListHtml(selectedFiles);
        if (selectedFiles.length > 0) {
          countBadge.textContent = `${selectedFiles.length} file(s) selected`;
          startBtn.disabled = false;
        } else {
          countBadge.textContent = '';
          startBtn.disabled = true;
        }

        // Attach remove buttons
        filesContainer.querySelectorAll('.remove-file-btn').forEach(btn => {
          btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const idx = parseInt(btn.getAttribute('data-index'), 10);
            if (!isNaN(idx)) {
              selectedFiles.splice(idx, 1);
              updateSelectedFilesView();
            }
          });
        });
      }

      function handleFilesSelected(fileList) {
        if (!fileList || fileList.length === 0) return;
        const newFiles = Array.from(fileList);
        const combined = [...selectedFiles, ...newFiles].slice(0, 50); // limit 50
        selectedFiles = combined;
        updateSelectedFilesView();
      }

      // Drag & drop handlers
      dropzone.addEventListener('click', () => fileInput.click());
      dropzone.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          fileInput.click();
        }
      });

      ['dragenter', 'dragover'].forEach(evt => {
        dropzone.addEventListener(evt, (e) => {
          e.preventDefault();
          dropzone.style.borderColor = 'var(--color-accent)';
          dropzone.style.background = 'var(--color-accent-soft)';
        });
      });

      ['dragleave', 'drop'].forEach(evt => {
        dropzone.addEventListener(evt, (e) => {
          e.preventDefault();
          dropzone.style.borderColor = 'var(--color-border)';
          dropzone.style.background = 'var(--color-surface-soft)';
        });
      });

      dropzone.addEventListener('drop', (e) => {
        const dt = e.dataTransfer;
        if (dt && dt.files && dt.files.length > 0) {
          handleFilesSelected(dt.files);
        }
      });

      fileInput.addEventListener('change', () => {
        if (fileInput.files && fileInput.files.length > 0) {
          handleFilesSelected(fileInput.files);
          fileInput.value = '';
        }
      });

      // Download template handler
      templateBtn.addEventListener('click', async () => {
        templateBtn.disabled = true;
        const origText = templateBtn.innerHTML;
        templateBtn.innerHTML = `<span>${escapeHtml(t('common.loading') || 'Loading...')}</span>`;
        await TicketService.downloadBulkTemplate();
        templateBtn.disabled = false;
        templateBtn.innerHTML = origText;
      });

      // Start bulk import execution
      startBtn.addEventListener('click', async () => {
        if (selectedFiles.length === 0 || isProcessing) return;
        isProcessing = true;

        uploadSection.style.display = 'none';
        progressSection.style.display = 'block';
        startBtn.disabled = true;
        cancelBtn.disabled = true;

        const allImported = [];
        const allDuplicates = [];
        const allErrors = [];

        try {
          const totalFiles = selectedFiles.length;

          for (let i = 0; i < totalFiles; i++) {
            const currentFile = selectedFiles[i];
            const pct = Math.round(((i) / totalFiles) * 100);
            progressBarFill.style.width = `${pct}%`;
            progressPercent.textContent = `${pct}%`;
            progressStatus.textContent = `${t('tickets.bulkModal.processing') || 'Processing'} (${i + 1}/${totalFiles})`;
            progressDetail.textContent = currentFile.name;

            const res = await TicketService.bulkImportTickets([currentFile]);
            if (res.success && res.data) {
              if (Array.isArray(res.data.imported)) allImported.push(...res.data.imported);
              if (Array.isArray(res.data.duplicates)) allDuplicates.push(...res.data.duplicates);
              if (Array.isArray(res.data.errors)) allErrors.push(...res.data.errors);
            } else {
              allErrors.push({
                fileName: currentFile.name,
                passengerName: '-',
                pnr: '-',
                ticketNumber: '-',
                error: res.error?.message || 'Upload processing error'
              });
            }
          }

          // Complete progress
          progressBarFill.style.width = '100%';
          progressPercent.textContent = '100%';
          progressStatus.textContent = t('tickets.bulkModal.saving') || 'Completed!';
          progressDetail.textContent = '';

          // Refresh tickets in store
          await store.refreshTickets().catch(() => {});

          // Display report
          const finalReport = {
            totalProcessed: allImported.length + allDuplicates.length + allErrors.length,
            totalImported: allImported.length,
            totalDuplicates: allDuplicates.length,
            totalErrors: allErrors.length,
            imported: allImported,
            duplicates: allDuplicates,
            errors: allErrors
          };

          progressSection.style.display = 'none';
          reportSection.innerHTML = renderReportHtml(finalReport);
          reportSection.style.display = 'block';

          // Update footer to show single "Finish / Refresh" button
          footer.innerHTML = `
            <div class="d-flex items-center justify-end w-full">
              <button type="button" class="btn btn-primary d-flex items-center gap-xs" id="bulk-finish-close-btn">
                ${icons.check('w-4 h-4')}
                <span>${escapeHtml(t('tickets.bulkModal.refreshTable') || 'Refresh & View Tickets')}</span>
              </button>
            </div>
          `;

          const finishBtn = modalEl.querySelector('#bulk-finish-close-btn');
          if (finishBtn) {
            finishBtn.addEventListener('click', () => {
              closeModal();
              if (typeof onSuccess === 'function') {
                onSuccess(finalReport);
              }
            });
          }

          if (allImported.length > 0) {
            showToast(
              `${allImported.length} ${t('tickets.bulkModal.totalImported') || 'tickets imported successfully'}`,
              'success'
            );
          } else if (allDuplicates.length > 0) {
            showToast(
              `${allDuplicates.length} ${t('tickets.bulkModal.totalDuplicates') || 'duplicates skipped'}`,
              'warning'
            );
          }
        } catch (err) {
          progressSection.style.display = 'none';
          uploadSection.style.display = 'block';
          startBtn.disabled = false;
          cancelBtn.disabled = false;
          showToast(err.message || 'Failed to process bulk upload', 'danger');
        } finally {
          isProcessing = false;
        }
      });
    }
  });
}

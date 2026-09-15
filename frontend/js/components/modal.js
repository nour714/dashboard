/**
 * AfricaTravel — Modal & Bottom Sheet Manager
 */

import { icons } from './icons.js';
import { escapeHtml } from '../utils/security.js';

let activeBackdrop = null;
let previousActiveElement = null;
let activeEscHandler = null;

export function openModal(options) {
  closeModal();

  const {
    title,
    subtitle = '',
    contentHtml,
    footerHtml = '',
    onOpen = null,
    maxWidth = '580px'
  } = options;

  previousActiveElement = document.activeElement;

  const backdrop = document.createElement('div');
  backdrop.className = 'modal-backdrop';

  backdrop.innerHTML = `
    <div class="modal-container" role="dialog" aria-modal="true" aria-labelledby="modal-title-text" style="max-width: ${maxWidth};">
      <div class="modal-header">
        <div>
          <div class="modal-title" id="modal-title-text">${escapeHtml(title)}</div>
          ${subtitle ? `<div class="modal-subtitle">${escapeHtml(subtitle)}</div>` : ''}
        </div>
        <button class="modal-close-btn" id="modal-close-trigger" aria-label="Close modal" data-modal-close>
          ${icons.close('w-4 h-4')}
        </button>
      </div>
      <div class="modal-body">
        ${contentHtml}
      </div>
      ${footerHtml ? `<div class="modal-footer">${footerHtml}</div>` : ''}
    </div>
  `;

  document.body.appendChild(backdrop);
  activeBackdrop = backdrop;

  // Request animation frame to trigger transition
  requestAnimationFrame(() => {
    backdrop.classList.add('open');
    const firstFocusable = backdrop.querySelector('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
    if (firstFocusable) {
      firstFocusable.focus();
    }
  });

  // Bind close triggers
  backdrop.querySelectorAll('[data-modal-close]').forEach(btn => {
    btn.addEventListener('click', closeModal);
  });

  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop) {
      closeModal();
    }
  });

  // Focus trap & Escape key handler
  activeEscHandler = (e) => {
    if (e.key === 'Escape') {
      closeModal();
      return;
    }

    if (e.key === 'Tab') {
      const focusable = Array.from(backdrop.querySelectorAll(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      ));
      if (focusable.length === 0) return;

      const firstEl = focusable[0];
      const lastEl = focusable[focusable.length - 1];

      if (e.shiftKey && document.activeElement === firstEl) {
        e.preventDefault();
        lastEl.focus();
      } else if (!e.shiftKey && document.activeElement === lastEl) {
        e.preventDefault();
        firstEl.focus();
      }
    }
  };
  document.addEventListener('keydown', activeEscHandler);

  if (typeof onOpen === 'function') {
    onOpen(backdrop);
  }

  return backdrop;
}

export function closeModal() {
  if (activeEscHandler) {
    document.removeEventListener('keydown', activeEscHandler);
    activeEscHandler = null;
  }

  if (activeBackdrop && activeBackdrop.parentNode) {
    activeBackdrop.classList.remove('open');
    const el = activeBackdrop;
    setTimeout(() => {
      if (el.parentNode) {
        el.parentNode.removeChild(el);
      }
    }, 250);
    activeBackdrop = null;
  }

  if (previousActiveElement && typeof previousActiveElement.focus === 'function') {
    previousActiveElement.focus();
    previousActiveElement = null;
  }
}

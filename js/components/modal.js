/**
 * AfricaTravel — Modal & Bottom Sheet Manager
 */

import { icons } from './icons.js';
import { escapeHtml } from '../utils/security.js';

let activeBackdrop = null;

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

  const backdrop = document.createElement('div');
  backdrop.className = 'modal-backdrop';

  backdrop.innerHTML = `
    <div class="modal-container" role="dialog" aria-modal="true" aria-labelledby="modal-title-text" style="max-width: ${maxWidth};">
      <div class="modal-header">
        <div>
          <div class="modal-title" id="modal-title-text">${escapeHtml(title)}</div>
          ${subtitle ? `<div class="modal-subtitle">${escapeHtml(subtitle)}</div>` : ''}
        </div>
        <button class="modal-close-btn" id="modal-close-trigger" aria-label="Close modal">
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
  });

  // Event handlers
  const closeBtn = backdrop.querySelector('#modal-close-trigger');
  if (closeBtn) {
    closeBtn.addEventListener('click', closeModal);
  }

  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop) {
      closeModal();
    }
  });

  const handleEsc = (e) => {
    if (e.key === 'Escape') {
      closeModal();
      document.removeEventListener('keydown', handleEsc);
    }
  };
  document.addEventListener('keydown', handleEsc);

  if (typeof onOpen === 'function') {
    onOpen(backdrop);
  }

  return backdrop;
}

export function closeModal() {
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
}

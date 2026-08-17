/**
 * AfriciaTravel / VoyageDesk — Toast Notification System
 */

import { icons } from './icons.js';
import { escapeHtml } from '../utils/security.js';

let toastContainer = null;

function ensureContainer() {
  if (!toastContainer || !document.body.contains(toastContainer)) {
    toastContainer = document.createElement('div');
    toastContainer.className = 'toast-container';
    document.body.appendChild(toastContainer);
  }
}

/**
 * Display a temporary toast message
 * @param {string} message
 * @param {'success'|'error'|'info'} type
 * @param {number} duration - ms
 */
export function showToast(message, type = 'success', duration = 3500) {
  ensureContainer();

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;

  const iconSvg = type === 'success'
    ? icons.check('w-4 h-4')
    : (type === 'error' ? icons.alertTriangle('w-4 h-4') : icons.mail('w-4 h-4'));

  toast.innerHTML = `
    ${iconSvg}
    <span>${escapeHtml(message)}</span>
  `;

  toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px) scale(0.95)';
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 300);
  }, duration);
}

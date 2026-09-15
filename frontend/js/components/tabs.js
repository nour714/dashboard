/**
 * AfricaTravel - Reusable Tabs Component
 */

import { escapeHtml } from '../utils/security.js';

export function renderTabs(tabs = [], activeTabId = '') {
  const currentActive = activeTabId || (tabs[0] && tabs[0].id) || '';

  const buttonsHtml = tabs.map(t => {
    const safeId = escapeHtml(t.id);
    const isActive = t.id === currentActive;
    return `
      <button
        type="button"
        id="tab-btn-${safeId}"
        class="tab-btn ${isActive ? 'active' : ''}"
        data-tab-target="${safeId}"
        role="tab"
        aria-selected="${isActive ? 'true' : 'false'}"
        aria-controls="tab-pane-${safeId}"
        tabindex="${isActive ? '0' : '-1'}"
      >
        ${escapeHtml(t.label || '')}
        ${t.badge !== undefined && t.badge !== null ? `<span class="badge badge-neutral ms-xs">${escapeHtml(String(t.badge))}</span>` : ''}
      </button>
    `;
  }).join('');

  return `
    <div class="tabs-header" id="tabs-header-nav" role="tablist">
      ${buttonsHtml}
    </div>
  `;
}

export function bindTabs(container, onTabChange) {
  const header = container.querySelector('#tabs-header-nav');
  if (!header) return;

  // Keyboard arrow navigation for tabs
  header.addEventListener('keydown', (e) => {
    const buttons = Array.from(header.querySelectorAll('.tab-btn'));
    const currentIndex = buttons.indexOf(document.activeElement);
    if (currentIndex === -1) return;

    let nextIndex = null;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      nextIndex = (currentIndex + 1) % buttons.length;
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      nextIndex = (currentIndex - 1 + buttons.length) % buttons.length;
    } else if (e.key === 'Home') {
      nextIndex = 0;
    } else if (e.key === 'End') {
      nextIndex = buttons.length - 1;
    }

    if (nextIndex !== null) {
      e.preventDefault();
      buttons[nextIndex].focus();
      buttons[nextIndex].click();
    }
  });

  header.addEventListener('click', (e) => {
    const btn = e.target.closest('.tab-btn');
    if (!btn) return;

    const targetId = btn.getAttribute('data-tab-target');
    if (!targetId) return;

    // Update active tab buttons, aria-selected, and tabindex
    header.querySelectorAll('.tab-btn').forEach(b => {
      b.classList.remove('active');
      b.setAttribute('aria-selected', 'false');
      b.setAttribute('tabindex', '-1');
    });
    btn.classList.add('active');
    btn.setAttribute('aria-selected', 'true');
    btn.setAttribute('tabindex', '0');

    // Update active tab panes with smooth animation
    const panes = container.querySelectorAll('.tab-pane');
    panes.forEach(pane => {
      const isTarget = pane.id === `tab-pane-${targetId}` || pane.getAttribute('data-tab-pane') === targetId;
      pane.setAttribute('role', 'tabpanel');
      pane.setAttribute('aria-labelledby', `tab-btn-${targetId}`);
      if (isTarget) {
        pane.classList.remove('tab-pane-animate');
        void pane.offsetWidth;
        pane.classList.add('active', 'tab-pane-animate');
      } else {
        pane.classList.remove('active', 'tab-pane-animate');
      }
    });

    if (typeof onTabChange === 'function') {
      onTabChange(targetId);
    }
  });
}

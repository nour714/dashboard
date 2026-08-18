/**
 * AfricaTravel - Reusable Tabs Component
 */

export function renderTabs(tabs = [], activeTabId = '') {
  const currentActive = activeTabId || (tabs[0] && tabs[0].id) || '';

  const buttonsHtml = tabs.map(t => `
    <button
      type="button"
      class="tab-btn ${t.id === currentActive ? 'active' : ''}"
      data-tab-target="${t.id}"
      role="tab"
      aria-selected="${t.id === currentActive ? 'true' : 'false'}"
    >
      ${t.label}
      ${t.badge ? `<span class="badge badge-neutral ms-xs">${t.badge}</span>` : ''}
    </button>
  `).join('');

  return `
    <div class="tabs-header" id="tabs-header-nav" role="tablist">
      ${buttonsHtml}
    </div>
  `;
}

export function bindTabs(container, onTabChange) {
  const header = container.querySelector('#tabs-header-nav');
  if (!header) return;

  header.addEventListener('click', (e) => {
    const btn = e.target.closest('.tab-btn');
    if (!btn) return;

    const targetId = btn.getAttribute('data-tab-target');
    if (!targetId) return;

    // Update active tab buttons and aria-selected
    header.querySelectorAll('.tab-btn').forEach(b => {
      b.classList.remove('active');
      b.setAttribute('aria-selected', 'false');
    });
    btn.classList.add('active');
    btn.setAttribute('aria-selected', 'true');

    // Update active tab panes with smooth animation
    const panes = container.querySelectorAll('.tab-pane');
    panes.forEach(pane => {
      if (pane.id === `tab-pane-${targetId}` || pane.getAttribute('data-tab-pane') === targetId) {
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

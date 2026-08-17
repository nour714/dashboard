/**
 * AfricaTravel — Reusable Tabs Component
 */

export function renderTabs(tabs = [], activeTabId = '') {
  const currentActive = activeTabId || (tabs[0] && tabs[0].id) || '';

  const buttonsHtml = tabs.map(t => `
    <button
      type="button"
      class="tab-btn ${t.id === currentActive ? 'active' : ''}"
      data-tab-target="${t.id}"
    >
      ${t.label}
      ${t.badge ? `<span class="badge badge-neutral" style="margin-left: 4px;">${t.badge}</span>` : ''}
    </button>
  `).join('');

  return `
    <div class="tabs-header" id="tabs-header-nav">
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

    // Update active tab buttons
    header.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    // Update active tab panes
    const panes = container.querySelectorAll('.tab-pane');
    panes.forEach(pane => {
      if (pane.id === `tab-pane-${targetId}` || pane.getAttribute('data-tab-pane') === targetId) {
        pane.classList.add('active');
      } else {
        pane.classList.remove('active');
      }
    });

    if (typeof onTabChange === 'function') {
      onTabChange(targetId);
    }
  });
}

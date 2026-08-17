/**
 * AfriciaTravel — Settings Page
 */

import { store } from '../state/store.js';
import { icons } from '../components/icons.js';
import { renderPageHeader } from '../components/page-header.js';
import { showToast } from '../components/toast.js';

let activeSection = 'profile';

export const SettingsPage = {
  render() {
    const { settings, currentUser } = store.getState();

    const headerHtml = renderPageHeader({
      title: 'Settings',
      subtitle: 'Workspace preferences, profile details, security, and financial configuration.'
    });

    const settingsMenu = [
      { id: 'profile', label: 'Profile', icon: 'user' },
      { id: 'security', label: 'Security', icon: 'shield' },
      { id: 'company', label: 'Company', icon: 'building' },
      { id: 'currency', label: 'Currency & Payments', icon: 'payments' },
      { id: 'notifications', label: 'Notifications', icon: 'bell' },
      { id: 'statuses', label: 'Ticket Statuses', icon: 'ticket' }
    ];

    const menuHtml = settingsMenu.map(m => `
      <button
        type="button"
        class="nav-link ${m.id === activeSection ? 'active' : ''}"
        data-settings-target="${m.id}"
        style="color: var(--color-text); border: 1px solid var(--color-border-soft); margin-bottom: 6px; background-color: ${m.id === activeSection ? 'var(--color-accent-soft)' : '#ffffff'}; border-color: ${m.id === activeSection ? 'var(--color-accent-border)' : 'var(--color-border-soft)'}; color: ${m.id === activeSection ? 'var(--color-accent)' : 'var(--color-text)'};"
      >
        ${icons[m.icon]('w-4 h-4')}
        <span>${m.label}</span>
      </button>
    `).join('');

    let contentHtml = '';

    if (activeSection === 'profile') {
      contentHtml = `
        <div class="card mb-lg">
          <div class="card-header">
            <div>
              <h3 class="card-title">Personal Information</h3>
              <p class="card-subtitle">Update your photo and personal contact details here.</p>
            </div>
          </div>
          <div class="card-body">
            <form id="profile-form">
              <div class="d-flex items-center gap-md mb-lg">
                <div class="sidebar-user-avatar" style="width: 64px; height: 64px; font-size: 22px; background: linear-gradient(135deg, #1e3a8a, #2563eb);">
                  ${(currentUser.name || currentUser.fullName || 'Ahmed Hassan').split(' ').map(n => n[0]).filter(Boolean).join('').substring(0, 2).toUpperCase()}
                </div>
                <div>
                  <button type="button" class="btn btn-sm btn-secondary" id="change-avatar-btn">Change Photo</button>
                </div>
              </div>

              <div class="form-grid-2">
                <div class="form-group">
                  <label class="form-label" for="setting-name">Full Name</label>
                  <input type="text" id="setting-name" class="form-control" value="${currentUser.name || 'Ahmed Hassan'}" required />
                </div>
                <div class="form-group">
                  <label class="form-label" for="setting-email">Email Address</label>
                  <input type="email" id="setting-email" class="form-control" value="${currentUser.email || 'admin@africiatravel.com'}" required />
                </div>
              </div>

              <div class="form-group">
                <label class="form-label" for="setting-role">Role Title</label>
                <input type="text" id="setting-role" class="form-control" value="${currentUser.title || currentUser.role || 'Senior Operations Director'}" readonly disabled />
              </div>

              <div class="d-flex justify-end gap-sm mt-md">
                <button type="button" class="btn btn-secondary" id="cancel-profile-btn">Cancel</button>
                <button type="submit" class="btn btn-primary">Save Changes</button>
              </div>
            </form>
          </div>
        </div>

        <div class="card">
          <div class="card-header">
            <div>
              <h3 class="card-title">Change Password</h3>
              <p class="card-subtitle">Ensure your account is using a long, random password to stay secure.</p>
            </div>
          </div>
          <div class="card-body">
            <form id="password-form">
              <div class="form-group">
                <label class="form-label" for="curr-pw">Current Password</label>
                <input type="password" id="curr-pw" class="form-control" value="••••••••" />
              </div>
              <div class="form-grid-2">
                <div class="form-group">
                  <label class="form-label" for="new-pw">New Password</label>
                  <input type="password" id="new-pw" class="form-control" placeholder="••••••••" />
                </div>
                <div class="form-group">
                  <label class="form-label" for="conf-pw">Confirm New Password</label>
                  <input type="password" id="conf-pw" class="form-control" placeholder="••••••••" />
                </div>
              </div>
              <div class="d-flex justify-end mt-md">
                <button type="submit" class="btn btn-secondary">Update Password</button>
              </div>
            </form>
          </div>
        </div>
      `;
    } else if (activeSection === 'security') {
      contentHtml = `
        <div class="card">
          <div class="card-header">
            <h3 class="card-title">Security & Session Management</h3>
          </div>
          <div class="card-body d-flex flex-column gap-md">
            <div class="d-flex justify-between items-center p-md" style="background-color: var(--color-surface); border-radius: var(--radius-lg);">
              <div>
                <strong>Two-Factor Authentication (2FA)</strong>
                <p class="text-sm text-muted">Add an extra layer of security to your operations account.</p>
              </div>
              <span class="badge badge-paid">ENABLED</span>
            </div>
            <div class="d-flex justify-between items-center p-md" style="background-color: var(--color-surface); border-radius: var(--radius-lg);">
              <div>
                <strong>Active Sessions</strong>
                <p class="text-sm text-muted">Chrome on Windows • Cairo, Egypt (Current Session)</p>
              </div>
              <button type="button" class="btn btn-sm btn-danger-outline" id="revoke-sessions-btn">Revoke Others</button>
            </div>
            <div class="d-flex justify-between items-center p-md" style="background-color: var(--color-surface); border-radius: var(--radius-lg); border: 1px solid var(--color-border-danger, #fecaca);">
              <div>
                <strong class="text-danger">Sign Out of Account</strong>
                <p class="text-sm text-muted">End your active session on this device and return to login.</p>
              </div>
              <button type="button" class="btn btn-sm btn-danger" id="setting-sign-out-btn">Sign Out</button>
            </div>
          </div>
        </div>
      `;
    } else if (activeSection === 'company') {
      contentHtml = `
        <div class="card">
          <div class="card-header">
            <h3 class="card-title">Company & Agency Profile</h3>
          </div>
          <div class="card-body">
            <form id="company-form">
              <div class="form-group">
                <label class="form-label" for="co-name">Agency Legal Name</label>
                <input type="text" id="co-name" class="form-control" value="${settings.company.name}" />
              </div>
              <div class="form-grid-2">
                <div class="form-group">
                  <label class="form-label" for="co-iata">IATA Numeric Code</label>
                  <input type="text" id="co-iata" class="form-control" value="${settings.company.iataNumber}" />
                </div>
                <div class="form-group">
                  <label class="form-label" for="co-tax">Tax ID / Commercial Reg.</label>
                  <input type="text" id="co-tax" class="form-control" value="${settings.company.taxId}" />
                </div>
              </div>
              <div class="form-group">
                <label class="form-label" for="co-addr">Registered HQ Address</label>
                <input type="text" id="co-addr" class="form-control" value="${settings.company.address}" />
              </div>
              <div class="d-flex justify-end mt-md">
                <button type="submit" class="btn btn-primary">Save Company Details</button>
              </div>
            </form>
          </div>
        </div>
      `;
    } else if (activeSection === 'currency') {
      contentHtml = `
        <div class="card">
          <div class="card-header">
            <h3 class="card-title">Currency & Payment Methods</h3>
          </div>
          <div class="card-body d-flex flex-column gap-md">
            <div class="form-group">
              <label class="form-label">Base Operating Currency</label>
              <select class="form-control" style="max-width: 240px;">
                <option value="EGP" selected>Egyptian Pound (EGP)</option>
                <option value="USD">US Dollar (USD)</option>
                <option value="EUR">Euro (EUR)</option>
                <option value="SAR">Saudi Riyal (SAR)</option>
                <option value="AED">UAE Dirham (AED)</option>
              </select>
            </div>
            <div>
              <label class="form-label mb-xs">Accepted Payment Methods</label>
              <div class="d-flex flex-wrap gap-xs">
                ${settings.paymentMethods.map(m => `<span class="badge badge-neutral" style="font-size: 13px; padding: 6px 12px;">${m}</span>`).join('')}
              </div>
            </div>
          </div>
        </div>
      `;
    } else {
      contentHtml = `
        <div class="card">
          <div class="card-header">
            <h3 class="card-title">${activeSection.toUpperCase()} Settings</h3>
          </div>
          <div class="card-body">
            <p class="text-muted">Configuration active and synchronized with workspace.</p>
          </div>
        </div>
      `;
    }

    return `
      ${headerHtml}

      <!-- Admin Secondary Nav Tabs -->
      <div class="tabs-header mb-lg" style="border-radius: var(--radius-xl); border: 1px solid var(--color-border-soft);">
        <a href="/employees" class="tab-btn" data-link>Employees</a>
        <a href="/activity" class="tab-btn" data-link>Activity Log</a>
        <a href="/settings" class="tab-btn active" data-link>Settings</a>
      </div>

      <div class="grid grid-cols-12 gap-lg">
        <!-- Settings Sidebar (4 Cols) -->
        <div class="col-span-4">
          <div class="card p-sm">
            ${menuHtml}
          </div>
        </div>

        <!-- Settings Content (8 Cols) -->
        <div class="col-span-8">
          ${contentHtml}
        </div>
      </div>
    `;
  },

  afterRender(container) {
    const navButtons = container.querySelectorAll('[data-settings-target]');
    navButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        activeSection = btn.getAttribute('data-settings-target');
        container.innerHTML = SettingsPage.render();
        SettingsPage.afterRender(container);
      });
    });

    const profileForm = container.querySelector('#profile-form');
    if (profileForm) {
      profileForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const name = container.querySelector('#setting-name').value.trim();
        const email = container.querySelector('#setting-email').value.trim();

        store.updateSettings('profile', { fullName: name, email });
        showToast('Profile updated successfully!', 'success');
      });
    }

    const passwordForm = container.querySelector('#password-form');
    if (passwordForm) {
      passwordForm.addEventListener('submit', (e) => {
        e.preventDefault();
        showToast('Password changed successfully!', 'success');
      });
    }

    const companyForm = container.querySelector('#company-form');
    if (companyForm) {
      companyForm.addEventListener('submit', (e) => {
        e.preventDefault();
        showToast('Company information updated!', 'success');
      });
    }

    const revokeBtn = container.querySelector('#revoke-sessions-btn');
    if (revokeBtn) {
      revokeBtn.addEventListener('click', () => {
        showToast('All other active sessions revoked', 'info');
      });
    }

    const signOutBtn = container.querySelector('#setting-sign-out-btn');
    if (signOutBtn) {
      signOutBtn.addEventListener('click', () => {
        store.logout();
        showToast('Signed out successfully', 'info');
        window.history.pushState(null, null, '/login');
        window.dispatchEvent(new PopStateEvent('popstate'));
      });
    }
  }
};

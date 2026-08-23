/**
 * AfricaTravel — Settings Page
 */

import { store } from '../state/store.js';
import { AuthService } from '../services/auth-service.js';
import { icons } from '../components/icons.js';
import { renderPageHeader } from '../components/page-header.js';
import { showToast } from '../components/toast.js';
import { escapeHtml } from '../utils/security.js';
import { i18n, t } from '../i18n/i18n.js';

let activeSection = 'profile';

export const SettingsPage = {
  render() {
    const { settings } = store.getState();
    const currentUser = AuthService.getCurrentUser() || {};

    const headerHtml = renderPageHeader({
      title: t('settings.title'),
      subtitle: t('settings.subtitle')
    });

    const settingsMenu = [
      { id: 'profile', label: t('settings.tabs.profile'), icon: 'user' },
      { id: 'language', label: t('settings.tabs.language'), icon: 'globe' },
      { id: 'security', label: t('settings.tabs.security'), icon: 'shield' },
      { id: 'company', label: t('settings.tabs.company'), icon: 'building' },
      { id: 'currency', label: t('settings.tabs.currency'), icon: 'payments' },
      { id: 'notifications', label: t('settings.tabs.notifications'), icon: 'bell' },
      { id: 'statuses', label: t('settings.tabs.statuses'), icon: 'ticket' }
    ];

    const menuHtml = settingsMenu.map(m => `
      <button
        type="button"
        class="tab-btn ${m.id === activeSection ? 'active' : ''}"
        data-settings-target="${m.id}"
        style="display: inline-flex; align-items: center; gap: 8px; font-size: 14px; padding: 12px 18px; border: none; border-bottom: 2px solid ${m.id === activeSection ? 'var(--color-accent)' : 'transparent'}; color: ${m.id === activeSection ? 'var(--color-accent)' : 'var(--color-text-secondary)'}; background: transparent; cursor: pointer; white-space: nowrap; font-weight: ${m.id === activeSection ? '600' : '500'}; transition: all var(--transition-fast);"
      >
        ${icons[m.icon] ? icons[m.icon]('w-4 h-4') : ''}
        <span>${escapeHtml(m.label)}</span>
      </button>
    `).join('');

    let contentHtml = '';

    if (activeSection === 'profile') {
      const isAr = i18n.getLanguage() === 'ar';
      const rawName = currentUser.name || currentUser.fullName || 'Mohamed Raafat';
      const userName = (rawName === 'Mohamed Raafat' && isAr) ? 'محمد رأفت' : rawName;
      const rawRole = currentUser.title || currentUser.role || 'Senior Operations Director';
      const userRole = t(`roles.${rawRole}`) || rawRole;
      const userInitials = isAr ? 'م.ر' : (userName.split(' ').map(n => n[0]).filter(Boolean).join('').substring(0, 2).toUpperCase() || 'MR');

      contentHtml = `
        <div class="card mb-lg">
          <div class="card-header">
            <div>
              <h3 class="card-title">${escapeHtml(t('settings.profile.title'))}</h3>
              <p class="card-subtitle">${escapeHtml(t('settings.profile.subtitle'))}</p>
            </div>
          </div>
          <div class="card-body">
            <form id="profile-form">
              <div class="d-flex items-center gap-md mb-lg">
                <div class="sidebar-user-avatar" style="width: 64px; height: 64px; font-size: 22px; background: linear-gradient(135deg, #1e3a8a, #2563eb);">
                  ${escapeHtml(userInitials)}
                </div>
                <div>
                  <button type="button" class="btn btn-sm btn-secondary" id="change-avatar-btn">${escapeHtml(t('settings.profile.changePhoto'))}</button>
                </div>
              </div>

              <div class="form-grid-2">
                <div class="form-group">
                  <label class="form-label" for="setting-name">${escapeHtml(t('settings.profile.fullName'))}</label>
                  <input type="text" id="setting-name" class="form-control" value="${escapeHtml(userName)}" required />
                </div>
                <div class="form-group">
                  <label class="form-label" for="setting-email">${escapeHtml(t('settings.profile.email'))}</label>
                  <input type="email" id="setting-email" class="form-control ltr-field" value="${escapeHtml(currentUser.email || 'admin@africatravel.com')}" required />
                </div>
              </div>

              <div class="form-group">
                <label class="form-label" for="setting-role">${escapeHtml(t('settings.profile.roleTitle'))}</label>
                <input type="text" id="setting-role" class="form-control" value="${escapeHtml(userRole)}" readonly disabled />
              </div>

              <div class="d-flex justify-end gap-sm mt-md">
                <button type="submit" class="btn btn-primary">${escapeHtml(t('common.saveChanges'))}</button>
              </div>
            </form>
          </div>
        </div>

        <div class="card">
          <div class="card-header">
            <div>
              <h3 class="card-title">${escapeHtml(t('settings.profile.changePassword'))}</h3>
            </div>
          </div>
          <div class="card-body">
            <form id="password-form">
              <div class="form-group">
                <label class="form-label" for="curr-pw">${escapeHtml(t('settings.profile.currentPassword'))}</label>
                <input type="password" id="curr-pw" class="form-control" placeholder="••••••••" autocomplete="current-password" required />
              </div>
              <div class="form-grid-2">
                <div class="form-group">
                  <label class="form-label" for="new-pw">${escapeHtml(t('settings.profile.newPassword'))}</label>
                  <input type="password" id="new-pw" class="form-control" placeholder="••••••••" autocomplete="new-password" minlength="6" required />
                </div>
                <div class="form-group">
                  <label class="form-label" for="conf-pw">${escapeHtml(t('settings.profile.confirmPassword'))}</label>
                  <input type="password" id="conf-pw" class="form-control" placeholder="••••••••" autocomplete="new-password" minlength="6" required />
                </div>
              </div>
              <div class="d-flex justify-end mt-md">
                <button type="submit" class="btn btn-primary" id="save-pw-btn">${escapeHtml(t('settings.profile.updatePassword'))}</button>
              </div>
            </form>
          </div>
        </div>
      `;
    } else if (activeSection === 'language') {
      const curLang = i18n.getLanguage();
      contentHtml = `
        <div class="card">
          <div class="card-header">
            <div>
              <h3 class="card-title">${escapeHtml(t('settings.languageSection.title'))}</h3>
              <p class="card-subtitle">${escapeHtml(t('settings.languageSection.subtitle'))}</p>
            </div>
          </div>
          <div class="card-body d-flex flex-column gap-md">
            <p class="text-sm text-secondary">${escapeHtml(t('settings.languageSection.description'))}</p>
            
            <div class="form-group">
              <label class="form-label mb-xs">${escapeHtml(t('settings.languageSection.currentLang'))}</label>
              <div class="d-flex flex-column gap-sm">
                <label class="d-flex items-center gap-sm p-md" style="background-color: var(--color-surface); border: 2px solid ${curLang === 'en' ? 'var(--color-accent)' : 'var(--color-border-soft)'}; border-radius: var(--radius-lg); cursor: pointer;">
                  <input type="radio" name="lang-selector-radio" value="en" ${curLang === 'en' ? 'checked' : ''} style="cursor: pointer; width: 18px; height: 18px;" />
                  <div>
                    <strong style="font-size: 15px;">English</strong>
                    <div class="text-xs text-muted">Left-to-Right (LTR) • English (Global / Egypt)</div>
                  </div>
                </label>

                <label class="d-flex items-center gap-sm p-md" style="background-color: var(--color-surface); border: 2px solid ${curLang === 'ar' ? 'var(--color-accent)' : 'var(--color-border-soft)'}; border-radius: var(--radius-lg); cursor: pointer;">
                  <input type="radio" name="lang-selector-radio" value="ar" ${curLang === 'ar' ? 'checked' : ''} style="cursor: pointer; width: 18px; height: 18px;" />
                  <div>
                    <strong style="font-size: 15px;">العربية</strong>
                    <div class="text-xs text-muted">Right-to-Left (RTL) • العربية (مصر والشرق الأوسط)</div>
                  </div>
                </label>
              </div>
            </div>

            <div class="d-flex justify-end mt-md">
              <button type="button" class="btn btn-primary" id="save-language-btn">${escapeHtml(t('common.saveChanges'))}</button>
            </div>
          </div>
        </div>
      `;
    } else if (activeSection === 'security') {
      contentHtml = `
        <div class="card">
          <div class="card-header">
            <h3 class="card-title">${escapeHtml(t('settings.securitySection.title'))}</h3>
          </div>
          <div class="card-body d-flex flex-column gap-md">
            <div class="d-flex justify-between items-center p-md" style="background-color: var(--color-surface); border-radius: var(--radius-lg);">
              <div>
                <strong>${escapeHtml(t('settings.securitySection.twoFactor'))}</strong>
                <p class="text-sm text-muted">${escapeHtml(t('settings.securitySection.twoFactorDesc'))}</p>
              </div>
              <span class="badge badge-paid">${escapeHtml(t('common.enabled'))}</span>
            </div>
            <div class="d-flex justify-between items-center p-md" style="background-color: var(--color-surface); border-radius: var(--radius-lg);">
              <div>
                <strong>${escapeHtml(t('settings.securitySection.activeSessions'))}</strong>
                <p class="text-sm text-muted">${escapeHtml(t('settings.securitySection.activeSessionsDesc'))}</p>
              </div>
              <button type="button" class="btn btn-sm btn-danger-outline" id="revoke-sessions-btn">${escapeHtml(t('settings.securitySection.revokeOthers'))}</button>
            </div>
            <div class="d-flex justify-between items-center p-md" style="background-color: var(--color-surface); border-radius: var(--radius-lg); border: 1px solid var(--color-border-danger, #fecaca);">
              <div>
                <strong class="text-danger">${escapeHtml(t('settings.securitySection.signOutAccount'))}</strong>
                <p class="text-sm text-muted">${escapeHtml(t('settings.securitySection.signOutDesc'))}</p>
              </div>
              <button type="button" class="btn btn-sm btn-danger" id="setting-sign-out-btn">${escapeHtml(t('common.signOut'))}</button>
            </div>
          </div>
        </div>
      `;
    } else if (activeSection === 'company') {
      contentHtml = `
        <div class="card">
          <div class="card-header">
            <h3 class="card-title">${escapeHtml(t('settings.companySection.title'))}</h3>
          </div>
          <div class="card-body">
            <form id="company-form">
              <div class="form-group">
                <label class="form-label" for="co-name">${escapeHtml(t('settings.companySection.agencyName'))}</label>
                <input type="text" id="co-name" class="form-control" value="${escapeHtml(settings.company.name)}" />
              </div>
              <div class="form-grid-2">
                <div class="form-group">
                  <label class="form-label" for="co-iata">${escapeHtml(t('settings.companySection.iataNumber'))}</label>
                  <input type="text" id="co-iata" class="form-control ltr-field" value="${escapeHtml(settings.company.iataNumber)}" />
                </div>
                <div class="form-group">
                  <label class="form-label" for="co-tax">${escapeHtml(t('settings.companySection.taxId'))}</label>
                  <input type="text" id="co-tax" class="form-control ltr-field" value="${escapeHtml(settings.company.taxId)}" />
                </div>
              </div>
              <div class="form-group">
                <label class="form-label" for="co-addr">${escapeHtml(t('settings.companySection.address'))}</label>
                <input type="text" id="co-addr" class="form-control" value="${escapeHtml(settings.company.address)}" />
              </div>
              <div class="d-flex justify-end mt-md">
                <button type="submit" class="btn btn-primary">${escapeHtml(t('settings.companySection.saveCompany'))}</button>
              </div>
            </form>
          </div>
        </div>
      `;
    } else if (activeSection === 'currency') {
      contentHtml = `
        <div class="card">
          <div class="card-header">
            <h3 class="card-title">${escapeHtml(t('settings.currencySection.title'))}</h3>
          </div>
          <div class="card-body d-flex flex-column gap-md">
            <div class="form-group">
              <label class="form-label">${escapeHtml(t('settings.currencySection.baseCurrency'))}</label>
              <select class="form-control" style="max-width: 240px;">
                <option value="EGP" selected>Egyptian Pound (EGP - جنيه مصري)</option>
                <option value="USD">US Dollar (USD)</option>
                <option value="EUR">Euro (EUR)</option>
                <option value="SAR">Saudi Riyal (SAR)</option>
                <option value="AED">UAE Dirham (AED)</option>
              </select>
            </div>
            <div>
              <label class="form-label mb-xs">${escapeHtml(t('settings.currencySection.acceptedMethods'))}</label>
              <div class="d-flex flex-wrap gap-xs">
                ${settings.paymentMethods.map(m => `<span class="badge badge-neutral" style="font-size: 13px; padding: 6px 12px;">${escapeHtml(m)}</span>`).join('')}
              </div>
            </div>
          </div>
        </div>
      `;
    } else {
      contentHtml = `
        <div class="card">
          <div class="card-header">
            <h3 class="card-title">${escapeHtml(activeSection.toUpperCase())}</h3>
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
        <a href="/employees" class="tab-btn" data-link>${escapeHtml(t('nav.employees'))}</a>
        <a href="/activity" class="tab-btn" data-link>${escapeHtml(t('nav.activity'))}</a>
        <a href="/settings" class="tab-btn active" data-link>${escapeHtml(t('nav.settings'))}</a>
      </div>

      <!-- Settings Horizontal Tabs -->
      <div class="tabs-header mb-lg" style="border-radius: var(--radius-xl); border: 1px solid var(--color-border-soft); background: var(--color-surface-card); padding: 0 var(--spacing-sm); display: flex; align-items: center; gap: 4px; overflow-x: auto; scrollbar-width: none;">
        ${menuHtml}
      </div>

      <!-- Settings Content (Full Width) -->
      <div class="w-100">
        ${contentHtml}
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

    const saveLangBtn = container.querySelector('#save-language-btn');
    if (saveLangBtn) {
      saveLangBtn.addEventListener('click', () => {
        const checked = container.querySelector('input[name="lang-selector-radio"]:checked');
        if (checked) {
          const lang = checked.value;
          i18n.setLanguage(lang);
          showToast(t('toasts.languageChanged'), 'success');
        }
      });
    }

    const profileForm = container.querySelector('#profile-form');
    if (profileForm) {
      profileForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = container.querySelector('#setting-name').value.trim();
        const email = container.querySelector('#setting-email').value.trim();
        const submitBtn = profileForm.querySelector('button[type="submit"]');

        if (!name || !email) {
          showToast('Please enter both name and email', 'error');
          return;
        }

        if (submitBtn) submitBtn.disabled = true;
        const res = await AuthService.updateProfile({ fullName: name, email });
        if (submitBtn) submitBtn.disabled = false;

        if (res.success) {
          showToast(t('toasts.profileUpdated'), 'success');
          // Re-render settings page so updated initials and names are reflected
          container.innerHTML = SettingsPage.render();
          SettingsPage.afterRender(container);
        } else {
          showToast(res.error || 'Failed to update profile', 'error');
        }
      });
    }

    const passwordForm = container.querySelector('#password-form');
    if (passwordForm) {
      passwordForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const currPwInput = container.querySelector('#curr-pw');
        const newPwInput = container.querySelector('#new-pw');
        const confPwInput = container.querySelector('#conf-pw');
        const submitBtn = container.querySelector('#save-pw-btn');

        const currentPassword = currPwInput.value;
        const newPassword = newPwInput.value;
        const confirmPassword = confPwInput.value;

        if (!currentPassword) {
          showToast('Please enter your current password', 'error');
          return;
        }

        if (newPassword.length < 6) {
          showToast('New password must be at least 6 characters', 'error');
          return;
        }

        if (newPassword !== confirmPassword) {
          showToast('New password and confirmation do not match', 'error');
          return;
        }

        if (submitBtn) submitBtn.disabled = true;
        const res = await AuthService.changePassword(currentPassword, newPassword);
        if (submitBtn) submitBtn.disabled = false;

        if (res.success) {
          showToast(t('toasts.passwordChanged'), 'success');
          currPwInput.value = '';
          newPwInput.value = '';
          confPwInput.value = '';
        } else {
          showToast(res.error || 'Failed to change password', 'error');
        }
      });
    }

    const companyForm = container.querySelector('#company-form');
    if (companyForm) {
      companyForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = container.querySelector('#co-name')?.value.trim() || '';
        const iataNumber = container.querySelector('#co-iata')?.value.trim() || '';
        const taxId = container.querySelector('#co-tax')?.value.trim() || '';
        const address = container.querySelector('#co-addr')?.value.trim() || '';
        const submitBtn = companyForm.querySelector('button[type="submit"]');

        if (submitBtn) submitBtn.disabled = true;
        const res = await store.saveSettings('company', { name, iataNumber, taxId, address });
        if (submitBtn) submitBtn.disabled = false;

        if (res.success) {
          showToast(t('toasts.companyUpdated'), 'success');
        } else {
          showToast(res.error?.message || 'Failed to update company settings', 'error');
        }
      });
    }

    const revokeBtn = container.querySelector('#revoke-sessions-btn');
    if (revokeBtn) {
      revokeBtn.addEventListener('click', () => {
        showToast(t('toasts.sessionsRevoked'), 'info');
      });
    }

    const signOutBtn = container.querySelector('#setting-sign-out-btn');
    if (signOutBtn) {
      signOutBtn.addEventListener('click', async () => {
        await AuthService.logout();
        showToast(t('toasts.signedOut'), 'info');
        window.history.pushState(null, null, '/login');
        window.dispatchEvent(new PopStateEvent('popstate'));
      });
    }
  }
};

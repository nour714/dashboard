/**
 * AfricaTravel — Login Page
 */

import { icons } from '../components/icons.js';
import { AuthService } from '../services/auth-service.js';
import { showToast } from '../components/toast.js';
import { i18n, t } from '../i18n/i18n.js';
import { escapeHtml } from '../utils/security.js';

export const LoginPage = {
  render() {
    const curLang = i18n.getLanguage();
    const nextLangLabel = curLang === 'ar' ? 'English' : 'العربية';

    return `
      <div class="login-wrapper">
        <div class="login-brand-panel">
          <div class="sidebar-logo">
            <div class="sidebar-logo-icon">
              <img src="/assets/logo.png" alt="AfricaTravel Logo" class="sidebar-logo-img no-flip" />
            </div>
            <div class="sidebar-logo-text">
              <span class="sidebar-logo-title">AfricaTravel</span>
              <span class="sidebar-logo-subtitle" style="color: #94a3b8;">${escapeHtml(t('brand.tagline'))}</span>
            </div>
          </div>

          <div class="login-brand-content">
            <h1 class="login-brand-heading">${escapeHtml(t('brand.platform'))}</h1>
            <p class="login-brand-subtext">
              ${escapeHtml(t('brand.terminal'))}
            </p>
          </div>

          <div style="font-size: 13px; color: #64748b;">
            © ${new Date().getFullYear()} AfricaTravel Enterprise. All rights reserved.
          </div>
        </div>

        <div class="login-form-panel">
          <div class="d-flex justify-end mb-md">
            <button
              type="button"
              class="topbar-lang-btn"
              id="login-lang-toggle-btn"
              title="${escapeHtml(t('common.switchLanguage'))}"
            >
              ${icons.globe('w-4 h-4')}
              <span>${escapeHtml(nextLangLabel)}</span>
            </button>
          </div>

          <div class="login-form-inner">
            <h2 class="login-title">${escapeHtml(t('login.title'))}</h2>
            <p class="login-subtitle">${escapeHtml(t('login.subtitle'))}</p>

            <form id="login-form">
              <div class="form-group">
                <label class="form-label" for="login-email">${escapeHtml(t('login.emailLabel'))}</label>
                <div class="input-prefix-group">
                  <span class="input-prefix">${icons.mail('w-4 h-4')}</span>
                  <input
                    type="email"
                    id="login-email"
                    class="form-control ltr-field"
                    placeholder="agent@africatravel.com"
                    value="admin@africatravel.com"
                    required
                  />
                </div>
              </div>

              <div class="form-group">
                <div class="d-flex justify-between items-center mb-xs">
                  <label class="form-label m-0" for="login-password">${escapeHtml(t('login.passwordLabel'))}</label>
                </div>
                <div class="input-prefix-group">
                  <span class="input-prefix">${icons.lock('w-4 h-4')}</span>
                  <input
                    type="password"
                    id="login-password"
                    class="form-control"
                    placeholder="••••••••"
                    value="password123"
                    required
                  />
                </div>
              </div>

              <div class="form-group mb-lg">
                <label class="d-flex items-center gap-xs" style="font-size: 13px; cursor: pointer;">
                  <input type="checkbox" id="remember-me" checked />
                  <span>${escapeHtml(t('login.rememberMe'))}</span>
                </label>
              </div>

              <button type="submit" class="btn btn-primary btn-block btn-lg" id="login-submit-btn">
                ${escapeHtml(t('login.signInBtn'))}
              </button>
            </form>

            <div class="text-center mt-xl text-sm text-muted">
              Internal agency authorized personnel only.
            </div>
          </div>
        </div>
      </div>
    `;
  },

  afterRender(container) {
    const langBtn = container.querySelector('#login-lang-toggle-btn');
    if (langBtn) {
      langBtn.addEventListener('click', () => {
        i18n.toggleLanguage();
        container.innerHTML = LoginPage.render();
        LoginPage.afterRender(container);
      });
    }

    const form = container.querySelector('#login-form');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = container.querySelector('#login-email').value.trim();
      const password = container.querySelector('#login-password').value;

      if (!email || !password) {
        showToast('Please enter both email and password', 'error');
        return;
      }

      const submitBtn = form.querySelector('#login-submit-btn');
      if (submitBtn) submitBtn.disabled = true;

      const res = await AuthService.login(email, password);
      if (submitBtn) submitBtn.disabled = false;

      if (!res.success) {
        showToast(res.error || 'Authentication failed', 'error');
        return;
      }

      showToast('Signed in successfully', 'success');

      // Navigate to dashboard
      window.history.pushState(null, null, '/dashboard');
      window.dispatchEvent(new PopStateEvent('popstate'));
    });
  }
};

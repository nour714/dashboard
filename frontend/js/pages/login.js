/**
 * AfricaTravel — Login Page
 * Luxury African Safari & Aviation Inspired Portal
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
      <div class="login-page-container">
        <!-- Floating Language Switcher -->
        <div class="login-lang-switch">
          <button
            type="button"
            class="login-lang-btn"
            id="login-lang-toggle-btn"
            title="${escapeHtml(t('common.switchLanguage'))}"
          >
            ${icons.globe('w-4 h-4')}
            <span>${escapeHtml(nextLangLabel)}</span>
          </button>
        </div>

        <!-- Background Savannah Landscape Graphic -->
        <div class="login-savannah-bg" aria-hidden="true"></div>

        <!-- Top Branding Header (Above Card) -->
        <div class="login-top-brand">
          <div class="login-top-watermark-wrap" aria-hidden="true">
            <svg class="login-flight-arc-svg" viewBox="0 0 360 160" fill="none">
              <path d="M 30 130 Q 180 20 330 30" stroke="#B38D4F" stroke-dasharray="4 6" stroke-width="1.2" opacity="0.45" />
              <g transform="translate(305, 32) rotate(-10)">
                <path d="M0 -7 L5 6 L0 3.5 L-5 6 Z" fill="#B38D4F" opacity="0.75" />
              </g>
            </svg>
          </div>

          <div class="login-top-logo-wrap">
            <img src="/assets/logo.png" alt="AfricaTravel Logo" class="login-top-logo-img no-flip" />
          </div>
          <h1 class="login-top-brand-title">
            <span class="brand-africa">Africa</span><span class="brand-travel">Travel</span>
          </h1>
          <span class="login-top-tagline">${escapeHtml(t('login.systemTagline') || 'TRAVEL & TOURISM MANAGEMENT SYSTEM')}</span>
          <div class="login-gold-ornament"><span></span>◈<span></span></div>
        </div>

        <!-- Centered Split Login Card -->
        <div class="login-card">
          <!-- Side Brand & Status Panel (Left in LTR, Start in RTL) -->
          <div class="login-side-panel">
            <div class="login-side-content">
              <img src="/assets/logo.png" alt="AfricaTravel" class="login-side-logo-img no-flip" />
              <div class="login-side-brand-title">
                <span class="brand-africa">Africa</span><span class="brand-travel">Travel</span>
              </div>
              <span class="login-side-tagline">${escapeHtml(t('login.systemTagline') || 'TRAVEL & TOURISM MANAGEMENT SYSTEM')}</span>
              
              <div class="login-gold-ornament login-side-divider"><span></span>◈<span></span></div>

              <div class="login-side-status-box">
                <div class="login-side-status-title">${escapeHtml(t('login.systemPreparing') || 'جاري تجهيز النظام...')}</div>
                <div class="login-side-status-subtitle">${escapeHtml(t('login.systemWait') || 'يرجى الانتظار لحظة')}</div>
              </div>
            </div>

            <!-- Side Bottom Landscape Artwork -->
            <div class="login-side-landscape" aria-hidden="true"></div>
          </div>

          <!-- Main Login Form Panel -->
          <div class="login-main-panel">
            <div class="login-main-header">
              <h2 class="login-welcome-title">${escapeHtml(t('login.welcomeTitle') || 'مرحبًا بك مجدداً')}</h2>
              <div class="login-gold-ornament mb-xs"><span></span>◈<span></span></div>
              <p class="login-welcome-subtitle">${escapeHtml(t('login.welcomeSubtitle') || 'سجّل الدخول للوصول إلى لوحة التحكم')}</p>
            </div>

            <form id="login-form" class="login-form">
              <!-- Email Input -->
              <div class="login-form-group">
                <label class="login-field-label" for="login-email">${escapeHtml(t('login.emailLabel') || 'البريد الإلكتروني')}</label>
                <div class="login-input-wrap">
                  <span class="login-input-icon">${icons.mail('w-4 h-4')}</span>
                  <input
                    type="email"
                    id="login-email"
                    class="login-input ltr-field"
                    placeholder="${escapeHtml(t('login.emailPlaceholder') || 'example@mail.com')}"
                    autocomplete="username"
                    required
                  />
                </div>
              </div>

              <!-- Password Input -->
              <div class="login-form-group">
                <label class="login-field-label" for="login-password">${escapeHtml(t('login.passwordLabel') || 'كلمة المرور')}</label>
                <div class="login-input-wrap">
                  <span class="login-input-icon">${icons.lock('w-4 h-4')}</span>
                  <input
                    type="password"
                    id="login-password"
                    class="login-input"
                    placeholder="••••••••"
                    autocomplete="current-password"
                    required
                  />
                  <button
                    type="button"
                    class="login-password-toggle"
                    id="toggle-password-btn"
                    title="Toggle password visibility"
                    aria-label="Toggle password visibility"
                  >
                    ${icons.eye('w-4 h-4')}
                  </button>
                </div>
              </div>

              <!-- Remember Me Checkbox -->
              <div class="login-remember-row">
                <label class="login-checkbox-label" for="remember-me">
                  <input type="checkbox" id="remember-me" checked />
                  <span class="login-checkbox-custom"></span>
                  <span class="login-checkbox-text">${escapeHtml(t('login.rememberMe') || 'تذكر هذا الجهاز')}</span>
                </label>
              </div>

              <!-- Submit Button -->
              <button type="submit" class="login-submit-btn" id="login-submit-btn">
                ${icons.shieldStar('w-5 h-5')}
                <span>${escapeHtml(t('login.signInBtn') || 'تسجيل الدخول')}</span>
              </button>
            </form>
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

    const togglePasswordBtn = container.querySelector('#toggle-password-btn');
    const passwordInput = container.querySelector('#login-password');
    if (togglePasswordBtn && passwordInput) {
      togglePasswordBtn.addEventListener('click', () => {
        const isPass = passwordInput.type === 'password';
        passwordInput.type = isPass ? 'text' : 'password';
        togglePasswordBtn.innerHTML = isPass ? icons.eyeOff('w-4 h-4') : icons.eye('w-4 h-4');
      });
    }

    const form = container.querySelector('#login-form');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = container.querySelector('#login-email').value.trim();
      const password = container.querySelector('#login-password').value;
      const rememberMe = container.querySelector('#remember-me')?.checked ?? true;

      if (!email || !password) {
        showToast(t('login.enterCredentials') || 'يرجى إدخال البريد الإلكتروني وكلمة المرور', 'error');
        return;
      }

      const submitBtn = form.querySelector('#login-submit-btn');
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.classList.add('loading');
      }

      const res = await AuthService.login(email, password, rememberMe);
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.classList.remove('loading');
      }

      if (!res.success) {
        showToast(res.error || 'Authentication failed', 'error');
        return;
      }

      showToast(t('toasts.signedIn') || 'تم تسجيل الدخول بنجاح', 'success');

      // Navigate to dashboard
      window.history.pushState(null, null, '/dashboard');
      window.dispatchEvent(new PopStateEvent('popstate'));
    });
  }
};


/**
 * AfricaTravel — Login Page
 */

import { icons } from '../components/icons.js';
import { AuthService } from '../services/auth-service.js';
import { showToast } from '../components/toast.js';

export const LoginPage = {
  render() {
    return `
      <div class="login-wrapper">
        <div class="login-brand-panel">
          <div class="sidebar-logo">
            <div class="sidebar-logo-icon">
              <img src="/assets/logo.png" alt="AfricaTravel Logo" class="sidebar-logo-img" />
            </div>
            <div class="sidebar-logo-text">
              <span class="sidebar-logo-title">AfricaTravel</span>
              <span class="sidebar-logo-subtitle" style="color: #94a3b8;">Travel Operations</span>
            </div>
          </div>

          <div class="login-brand-content">
            <h1 class="login-brand-heading">Empowering travel operations.</h1>
            <p class="login-brand-subtext">
              Streamline itineraries, manage client portfolios, and access real-time global ticketing data from a single unified platform.
            </p>
          </div>

          <div style="font-size: 13px; color: #64748b;">
            © ${new Date().getFullYear()} AfricaTravel Enterprise. All rights reserved.
          </div>
        </div>

        <div class="login-form-panel">
          <div class="login-form-inner">
            <h2 class="login-title">Sign in to your account</h2>
            <p class="login-subtitle">Welcome back. Enter your credentials to access the workspace.</p>

            <form id="login-form">
              <div class="form-group">
                <label class="form-label" for="login-email">Work Email</label>
                <div class="input-prefix-group">
                  <span class="input-prefix">${icons.mail('w-4 h-4')}</span>
                  <input
                    type="email"
                    id="login-email"
                    class="form-control"
                    placeholder="agent@africatravel.com"
                    value="admin@africatravel.com"
                    required
                  />
                </div>
              </div>

              <div class="form-group">
                <div class="d-flex justify-between items-center mb-xs">
                  <label class="form-label m-0" for="login-password">Password</label>
                  <a href="#" class="text-sm" id="forgot-password-link">Forgot password?</a>
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
                  <span>Remember me</span>
                </label>
              </div>

              <button type="submit" class="btn btn-primary btn-block btn-lg" id="login-submit-btn">
                Sign in
              </button>
            </form>

            <div class="text-center mt-xl text-sm text-muted">
              Authorized personnel only. <a href="#" id="login-support-link">Help & Support</a>
            </div>
          </div>
        </div>
      </div>
    `;
  },

  afterRender(container) {
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

      const res = await AuthService.login(email, password);
      if (!res.success) {
        showToast(res.error || 'Authentication failed', 'error');
        return;
      }

      showToast('Signed in successfully', 'success');

      // Navigate to dashboard
      window.history.pushState(null, null, '/dashboard');
      window.dispatchEvent(new PopStateEvent('popstate'));
    });

    const forgotLink = container.querySelector('#forgot-password-link');
    if (forgotLink) {
      forgotLink.addEventListener('click', (e) => {
        e.preventDefault();
        showToast('Password reset link sent to your work email', 'info');
      });
    }

    const supportLink = container.querySelector('#login-support-link');
    if (supportLink) {
      supportLink.addEventListener('click', (e) => {
        e.preventDefault();
        showToast('Operations Support Hotline: +20 2 2415 8800', 'info');
      });
    }
  }
};

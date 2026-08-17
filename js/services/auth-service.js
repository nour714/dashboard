/**
 * AfriciaTravel / VoyageDesk — Mock Authentication Service
 *
 * NOTE: Authentication is currently mocked for frontend development and will be
 * replaced by the backend authentication API during backend integration.
 */

import { store } from '../state/store.js';

export const AuthService = {
  /**
   * Performs client-side mock authentication
   * @param {string} email
   * @param {string} password
   * @returns {Promise<{success: boolean, user?: object, error?: string}>}
   */
  async login(email, password) {
    if (!email || !email.trim()) {
      return { success: false, error: 'Work email is required' };
    }
    if (!password) {
      return { success: false, error: 'Password is required' };
    }

    try {
      const ok = store.login(email.trim(), password);
      if (ok) {
        return {
          success: true,
          user: store.getState().currentUser
        };
      }
      return { success: false, error: 'Authentication failed' };
    } catch (err) {
      return {
        success: false,
        error: err.message || 'Authentication failed'
      };
    }
  },

  /**
   * Terminates the current session and clears local auth state
   * @returns {Promise<{success: boolean}>}
   */
  async logout() {
    store.logout();
    return { success: true };
  },

  /**
   * Returns whether a user session is active
   * @returns {boolean}
   */
  isAuthenticated() {
    return Boolean(store.getState().isAuthenticated);
  },

  /**
   * Returns current active user profile or null
   * @returns {object|null}
   */
  getCurrentUser() {
    return store.getState().currentUser || null;
  },

  /**
   * Updates user profile in current state
   * @param {object} profileData
   */
  updateProfile(profileData) {
    store.updateSettings('profile', profileData);
    return this.getCurrentUser();
  }
};

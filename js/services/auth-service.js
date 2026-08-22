/**
 * AfricaTravel — Authentication Service
 *
 * Talks to the real backend JWT auth API (/api/auth/*). Access + refresh
 * tokens and the current user profile are persisted via api-client's session
 * helpers so route guards (AuthService.isAuthenticated) can check synchronously
 * without a network round-trip.
 */

import { store } from '../state/store.js';
import { getStoredUser, hasSession } from './api-client.js';

export const AuthService = {
  /**
   * Authenticates against the backend and hydrates application state.
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

    const result = await store.login(email.trim(), password);
    if (!result.success) {
      return { success: false, error: result.error?.message || 'Authentication failed' };
    }
    return { success: true, user: result.user };
  },

  /**
   * Revokes the refresh token server-side and clears local session state.
   * @returns {Promise<{success: boolean}>}
   */
  async logout() {
    await store.logout();
    return { success: true };
  },

  /**
   * Synchronous check used by route guards — based on presence of a stored
   * access token, not a live server round-trip.
   * @returns {boolean}
   */
  isAuthenticated() {
    return hasSession();
  },

  /**
   * Returns the cached current user profile, or null if signed out.
   * @returns {object|null}
   */
  getCurrentUser() {
    return store.getState().currentUser || getStoredUser();
  },

  /**
   * Updates the locally displayed profile. Note: there is currently no
   * backend self-profile endpoint, so this only affects the local UI.
   * @param {object} profileData
   */
  updateProfile(profileData) {
    store.updateSettings('profile', profileData);
    return this.getCurrentUser();
  }
};

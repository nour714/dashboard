/**
 * AfricaTravel — Authentication Service
 *
 * Talks to the real backend JWT auth API (/api/auth/*). Access + refresh
 * tokens and the current user profile are persisted via api-client's session
 * helpers so route guards (AuthService.isAuthenticated) can check synchronously
 * without a network round-trip.
 */

import { store } from '../state/store.js';
import { apiClient, getStoredUser, hasSession } from './api-client.js';

export const AuthService = {
  /**
   * Authenticates against the backend and hydrates application state.
   * @param {string} email
   * @param {string} password
   * @param {boolean} rememberMe
   * @returns {Promise<{success: boolean, user?: object, error?: string}>}
   */
  async login(email, password, rememberMe = true) {
    if (!email || !email.trim()) {
      return { success: false, error: 'Work email is required' };
    }
    if (!password) {
      return { success: false, error: 'Password is required' };
    }

    const result = await store.login(email.trim(), password, rememberMe);
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
   * Updates the user profile on the backend and in local state.
   * @param {{ fullName?: string, name?: string, email?: string, title?: string }} profileData
   * @returns {Promise<{success: boolean, user?: object, error?: string}>}
   */
  async updateProfile(profileData) {
    const payload = {
      name: profileData.fullName || profileData.name,
      email: profileData.email,
      title: profileData.title
    };
    const res = await apiClient.patch('/auth/profile', payload);
    if (res.success && res.data?.user) {
      store.updateSettings('profile', res.data.user);
      return { success: true, user: res.data.user };
    }
    return { success: false, error: res.error?.message || 'Failed to update profile' };
  },

  /**
   * Changes user password on the backend.
   * @param {string} currentPassword
   * @param {string} newPassword
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  async changePassword(currentPassword, newPassword) {
    const res = await apiClient.post('/auth/change-password', { currentPassword, newPassword });
    if (res.success) {
      return { success: true };
    }
    return { success: false, error: res.error?.message || 'Failed to change password' };
  }
};

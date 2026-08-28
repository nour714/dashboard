/**
 * AfricaTravel — Office Expenses Service
 *
 * Provides API communication for office expenses (services & transfers).
 */

import { apiClient } from './api-client.js';

export const ExpenseService = {
  /**
   * Fetch paginated expenses from backend with optional filters
   * @param {object} filters - { page, pageSize, category, startDate, endDate }
   */
  async getExpenses(filters = {}) {
    return await apiClient.get('/expenses', filters);
  },

  /**
   * Create a new expense record
   * @param {object} data - { category, amount, currency, description, date }
   */
  async createExpense(data) {
    return await apiClient.post('/expenses', data);
  },

  /**
   * Soft-delete an expense record (ADMIN only)
   * @param {string} expenseId
   */
  async deleteExpense(expenseId) {
    return await apiClient.delete(`/expenses/${expenseId}`);
  }
};

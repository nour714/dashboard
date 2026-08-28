/**
 * AfricaTravel — Office Expenses Controller
 */

import { ExpenseService } from '../services/expense.service.js';

export const ExpenseController = {
  async createExpense(req, res, next) {
    try {
      const expense = await ExpenseService.createExpense(req.body, req.user);
      return res.status(201).json({
        success: true,
        data: expense
      });
    } catch (err) {
      next(err);
    }
  },

  async getExpenses(req, res, next) {
    try {
      const result = await ExpenseService.getExpenses(req.query, req.user);
      return res.status(200).json({
        success: true,
        data: result.expenses,
        pagination: result.pagination
      });
    } catch (err) {
      next(err);
    }
  },

  async deleteExpense(req, res, next) {
    try {
      await ExpenseService.deleteExpense(req.params.id, req.user);
      return res.status(200).json({
        success: true,
        message: 'Expense deleted successfully'
      });
    } catch (err) {
      next(err);
    }
  }
};

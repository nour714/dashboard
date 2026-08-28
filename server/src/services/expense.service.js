/**
 * AfricaTravel — Office Expenses Management Service
 *
 * Handles creation, filtering, and deletion of office expense records (services & transfers).
 * - Admin sees all office expenses.
 * - Agent sees only the expenses they created.
 * - Only Admin can soft-delete expense records.
 */

import { getPrismaClient } from '../config/database.js';
import { NotFoundError, ForbiddenError } from '../domain/errors.js';

export const ExpenseService = {
  /**
   * Create a new expense record
   * @param {object} data
   * @param {object} currentUser
   */
  async createExpense(data, currentUser) {
    const prisma = getPrismaClient();
    return prisma.expense.create({
      data: {
        category: data.category,
        amount: data.amount,
        currency: data.currency || 'EGP',
        description: data.description.trim(),
        date: new Date(data.date),
        createdBy: currentUser.name || currentUser.email || 'Staff',
        createdById: currentUser.id || null
      }
    });
  },

  /**
   * Retrieve paginated expenses with visibility filtering based on role
   * @param {object} filters
   * @param {object} currentUser
   */
  async getExpenses(filters = {}, currentUser) {
    const prisma = getPrismaClient();
    const page = Number(filters.page) || 1;
    const pageSize = Number(filters.pageSize) || 25;
    const { category, startDate, endDate } = filters;

    const where = { deletedAt: null };

    // Role-based visibility: Agent sees only their own expenses; Admin sees all
    if (currentUser?.role !== 'ADMIN') {
      where.createdById = currentUser?.id;
    }

    if (category) {
      where.category = category;
    }

    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        // If only YYYY-MM-DD was provided, include the full end date up to end of day
        if (typeof endDate === 'string' && endDate.length <= 10) {
          end.setHours(23, 59, 59, 999);
        }
        where.date.lte = end;
      }
    }

    const [expenses, total] = await Promise.all([
      prisma.expense.findMany({
        where,
        orderBy: { date: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize
      }),
      prisma.expense.count({ where })
    ]);

    return {
      expenses,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / pageSize))
      }
    };
  },

  /**
   * Soft-delete an expense record (ADMIN only)
   * @param {string} expenseId
   * @param {object} currentUser
   */
  async deleteExpense(expenseId, currentUser) {
    const prisma = getPrismaClient();
    const existing = await prisma.expense.findFirst({
      where: { id: expenseId, deletedAt: null }
    });

    if (!existing) {
      throw new NotFoundError('Expense', expenseId);
    }

    if (currentUser?.role !== 'ADMIN') {
      throw new ForbiddenError('Only admins can delete expense records');
    }

    return prisma.expense.update({
      where: { id: existing.id },
      data: { deletedAt: new Date() }
    });
  }
};

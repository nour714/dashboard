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
import { AuditService } from './audit.service.js';
import { asDecimal, moneyNumber } from '../utils/money.js';

export const ExpenseService = {
  /**
   * Create a new expense record
   * @param {object} data
   * @param {object} currentUser
   */
  async createExpense(data, currentUser = {}) {
    const prisma = getPrismaClient();

    const executeCreation = async (tx) => {
      const newExpense = await tx.expense.create({
        data: {
          category: data.category,
          amount: data.amount,
          currency: data.currency || 'EGP',
          description: data.description.trim(),
          date: new Date(data.date),
          createdBy: currentUser?.name || currentUser?.email || 'Staff',
          createdById: currentUser?.id || null
        }
      });

      await AuditService.recordCriticalLog({
        user: currentUser?.name || currentUser?.email || 'Staff',
        userId: currentUser?.id || null,
        action: 'CREATE_EXPENSE',
        description: `Created office expense ${newExpense.id} (${newExpense.category}: ${newExpense.amount} ${newExpense.currency} - ${newExpense.description}).`,
        metadata: {
          expenseId: newExpense.id,
          category: newExpense.category,
          amount: Number(newExpense.amount),
          currency: newExpense.currency,
          description: newExpense.description,
          createdById: currentUser?.id || null
        }
      }, { tx });

      return newExpense;
    };

    if (typeof prisma.$transaction === 'function') {
      return await prisma.$transaction(executeCreation);
    }
    return await executeCreation(prisma);
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

    // Compute totals over the FULL filtered set (Prisma aggregate/groupBy, with fallback)
    let totalsByGroup = [];
    if (typeof prisma?.expense?.groupBy === 'function') {
      try {
        totalsByGroup = await prisma.expense.groupBy({
          by: ['category', 'currency'],
          where,
          _sum: {
            amount: true
          }
        });
      } catch {
        totalsByGroup = [];
      }
    }

    // Fallback if groupBy is not supported or mock
    if (totalsByGroup.length === 0 && typeof prisma?.expense?.findMany === 'function') {
      try {
        const allMatching = await prisma.expense.findMany({
          where,
          select: { amount: true, category: true, currency: true }
        });
        const map = {};
        for (const item of allMatching) {
          const curr = item.currency || 'EGP';
          const key = `${item.category}:${curr}`;
          if (!map[key]) {
            map[key] = { category: item.category, currency: curr, sum: asDecimal(0) };
          }
          map[key].sum = map[key].sum.plus(asDecimal(item.amount || 0));
        }
        totalsByGroup = Object.values(map).map(m => ({
          category: m.category,
          currency: m.currency,
          _sum: { amount: moneyNumber(m.sum) }
        }));
      } catch {
        totalsByGroup = [];
      }
    }

    const byCurrency = {};
    for (const group of totalsByGroup) {
      const curr = group.currency || 'EGP';
      const cat = (group.category || '').toUpperCase();
      const sumDec = asDecimal(group._sum?.amount || 0);

      if (!byCurrency[curr]) {
        byCurrency[curr] = {
          servicesDec: asDecimal(0),
          transfersDec: asDecimal(0)
        };
      }

      if (cat === 'SERVICES') {
        byCurrency[curr].servicesDec = byCurrency[curr].servicesDec.plus(sumDec);
      } else if (cat === 'TRANSFERS') {
        byCurrency[curr].transfersDec = byCurrency[curr].transfersDec.plus(sumDec);
      }
    }

    if (Object.keys(byCurrency).length === 0) {
      byCurrency['EGP'] = {
        servicesDec: asDecimal(0),
        transfersDec: asDecimal(0)
      };
    }

    const finalizedByCurrency = {};
    const currencies = Object.keys(byCurrency);

    for (const curr of currencies) {
      const b = byCurrency[curr];
      const services = moneyNumber(b.servicesDec);
      const transfers = moneyNumber(b.transfersDec);
      const grand = moneyNumber(b.servicesDec.plus(b.transfersDec));
      finalizedByCurrency[curr] = { services, transfers, grand, currency: curr };
    }

    const primaryCurr = currencies[0] || 'EGP';
    const primary = finalizedByCurrency[primaryCurr];

    const totals = {
      services: primary.services,
      transfers: primary.transfers,
      grand: primary.grand,
      currency: primaryCurr,
      byCurrency: finalizedByCurrency
    };

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
      },
      totals
    };
  },

  /**
   * Soft-delete an expense record (ADMIN only)
   * @param {string} expenseId
   * @param {object} currentUser
   */
  async deleteExpense(expenseId, currentUser = {}) {
    const prisma = getPrismaClient();

    const executeDeletion = async (tx) => {
      const existing = await tx.expense.findFirst({
        where: { id: expenseId, deletedAt: null }
      });

      if (!existing) {
        throw new NotFoundError('Expense', expenseId);
      }

      if (currentUser?.role !== 'ADMIN') {
        throw new ForbiddenError('Only admins can delete expense records');
      }

      await AuditService.recordCriticalLog({
        user: currentUser?.name || currentUser?.email || 'Admin',
        userId: currentUser?.id || null,
        action: 'DELETE_EXPENSE',
        description: `Admin ${currentUser?.name || 'Admin'} deleted office expense ${existing.id} (${existing.category}: ${existing.amount} ${existing.currency} - ${existing.description}).`,
        metadata: {
          adminId: currentUser?.id || null,
          expenseId: existing.id,
          category: existing.category,
          amount: Number(existing.amount),
          currency: existing.currency,
          description: existing.description
        }
      }, { tx });

      return await tx.expense.update({
        where: { id: existing.id },
        data: { deletedAt: new Date() }
      });
    };

    if (typeof prisma.$transaction === 'function') {
      return await prisma.$transaction(executeDeletion);
    }
    return await executeDeletion(prisma);
  },

  /**
   * Update an existing expense record (ADMIN only)
   * @param {string} expenseId
   * @param {object} data — partial fields to update
   * @param {object} currentUser
   */
  async updateExpense(expenseId, data, currentUser = {}) {
    const prisma = getPrismaClient();

    const executeUpdate = async (tx) => {
      const existing = await tx.expense.findFirst({
        where: { id: expenseId, deletedAt: null }
      });

      if (!existing) {
        throw new NotFoundError('Expense', expenseId);
      }

      if (currentUser?.role !== 'ADMIN') {
        throw new ForbiddenError('Only admins can edit expense records');
      }

      const updateData = {};
      if (data.category !== undefined) updateData.category = data.category;
      if (data.amount !== undefined) updateData.amount = data.amount;
      if (data.currency !== undefined) updateData.currency = data.currency;
      if (data.description !== undefined) updateData.description = data.description.trim();
      if (data.date !== undefined) updateData.date = new Date(data.date);

      const updated = await tx.expense.update({
        where: { id: existing.id },
        data: updateData
      });

      await AuditService.recordCriticalLog({
        user: currentUser?.name || currentUser?.email || 'Admin',
        userId: currentUser?.id || null,
        action: 'UPDATE_EXPENSE',
        description: `Admin ${currentUser?.name || 'Admin'} updated office expense ${existing.id} (${updated.category}: ${updated.amount} ${updated.currency} - ${updated.description}).`,
        metadata: {
          adminId: currentUser?.id || null,
          expenseId: existing.id,
          changes: updateData,
          previous: {
            category: existing.category,
            amount: Number(existing.amount),
            currency: existing.currency,
            description: existing.description,
            date: existing.date
          }
        }
      }, { tx });

      return updated;
    };

    if (typeof prisma.$transaction === 'function') {
      return await prisma.$transaction(executeUpdate);
    }
    return await executeUpdate(prisma);
  }
};

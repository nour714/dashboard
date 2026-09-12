/**
 * AfricaTravel - Audit Logging Service
 *
 * Persists and retrieves structured audit trail logs for all system mutations.
 */

import { getPrismaClient } from '../config/database.js';

export const AuditService = {
  /**
   * Records a new audit log entry
   * @param {{ user: string, userId?: string, action: string, ticketId?: string, customerId?: string, description: string, metadata?: object, ip?: string, userAgent?: string }} data
   * @param {{ required?: boolean, tx?: object }} [options] - If required is true, failure throws to roll back caller transaction
   */
  async recordLog(data, options = {}) {
    const isRequired = options.required === true;
    const client = options.tx || getPrismaClient();
    try {
      return await client.auditLog.create({
        data: {
          user: data.user || 'System',
          userId: data.userId || null,
          action: data.action,
          ticketId: data.ticketId || null,
          customerId: data.customerId || null,
          description: data.description,
          metadata: data.metadata ? data.metadata : undefined,
          ip: data.ip || null,
          userAgent: data.userAgent || null
        }
      });
    } catch (err) {
      console.error('⚠️ Failed to record audit log:', err.message);
      if (isRequired) {
        throw err;
      }
      return null;
    }
  },

  /**
   * Records a critical audit log entry that throws on failure (fail-closed).
   * Suitable for financial transactions and destructive operations to enforce rollback.
   * @param {object} data
   * @param {{ tx?: object }} [options]
   */
  async recordCriticalLog(data, options = {}) {
    return await this.recordLog(data, { ...options, required: true });
  },

  /**
   * Retrieves audit logs with optional filtering
   * @param {{ user?: string, action?: string, ticketId?: string, customerId?: string, fromDate?: string, toDate?: string, page?: number, limit?: number }} filters
   */
  async getLogs(filters = {}) {
    const prisma = getPrismaClient();
    const where = {};

    if (filters.user) {
      where.user = { contains: filters.user, mode: 'insensitive' };
    }
    if (filters.action) {
      where.action = filters.action;
    }
    if (filters.ticketId) {
      where.ticketId = filters.ticketId;
    }
    if (filters.customerId) {
      where.customerId = filters.customerId;
    }
    if (filters.fromDate || filters.toDate) {
      where.timestamp = {};
      if (filters.fromDate) where.timestamp.gte = new Date(filters.fromDate);
      if (filters.toDate) where.timestamp.lte = new Date(filters.toDate);
    }

    const page = Math.max(1, Number(filters.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(filters.limit) || 50));
    const skip = (page - 1) * limit;

    const [total, logs] = await Promise.all([
      prisma.auditLog.count({ where }),
      prisma.auditLog.findMany({
        where,
        orderBy: { timestamp: 'desc' },
        skip,
        take: limit
      })
    ]);

    return {
      logs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }
};

/**
 * AfricaTravel - Employee & User Management Service
 *
 * Implements employee operations with dynamic statistical calculations (sales,
 * collections, refunds, outstanding balances) computed via live query aggregation.
 */

import bcrypt from 'bcryptjs';
import { getPrismaClient } from '../config/database.js';
import { calculateTotalPaid, calculateRemaining, calculateTotalRefunded } from '../domain/ticket-rules.js';
import { ValidationError, NotFoundError, BusinessRuleError } from '../domain/errors.js';
import { AuditService } from './audit.service.js';

export const EmployeeService = {
  /**
   * Retrieves all employees with dynamically computed performance statistics
   */
  async getEmployees() {
    const prisma = getPrismaClient();

    const [users, tickets] = await Promise.all([
      prisma.user.findMany({
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          title: true,
          status: true,
          lastActive: true,
          createdAt: true
        },
        orderBy: { createdAt: 'asc' }
      }),
      prisma.ticket.findMany({
        include: {
          payments: true,
          refunds: true
        }
      })
    ]);

    // Compute dynamic financial statistics for each employee
    return users.map(user => {
      const userTickets = tickets.filter(t => t.createdById === user.id || t.createdBy === user.name);

      let sales = 0;
      let collected = 0;
      let refunds = 0;
      let outstanding = 0;

      userTickets.forEach(t => {
        const price = Number(t.ticketPrice) || 0;
        const paid = calculateTotalPaid(t.payments || []);
        const ref = calculateTotalRefunded(t.refunds || []);

        sales += price;
        collected += paid;
        refunds += ref;
        outstanding += calculateRemaining(price, paid);
      });

      return {
        ...user,
        ticketsCount: userTickets.length,
        sales,
        collected,
        refunds,
        outstanding,
        isCalculated: true
      };
    });
  },

  /**
   * Retrieves a single employee by ID with computed statistics
   * @param {string} employeeId
   */
  async getEmployeeById(employeeId) {
    const employees = await this.getEmployees();
    const employee = employees.find(e => e.id === employeeId);
    if (!employee) {
      throw new NotFoundError('Employee', employeeId);
    }
    return employee;
  },

  /**
   * Creates a new employee user
   * @param {object} data
   * @param {object} currentUser
   */
  async createEmployee(data, currentUser = {}) {
    const prisma = getPrismaClient();
    const cleanEmail = data.email.toLowerCase().trim();

    const existing = await prisma.user.findUnique({
      where: { email: cleanEmail }
    });

    if (existing) {
      throw new BusinessRuleError('An employee with this email already exists', 'EMAIL_ALREADY_EXISTS', { email: cleanEmail });
    }

    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(data.password, saltRounds);
    const newId = `EMP-${crypto.randomUUID().substring(0, 8).toUpperCase()}`;

    const newUser = await prisma.user.create({
      data: {
        id: newId,
        name: data.name.trim(),
        email: cleanEmail,
        role: ['ADMIN', 'AGENT', 'TICKET_ONLY'].includes(data.role) ? data.role : 'AGENT',
        title: data.title || (data.role === 'ADMIN' ? 'Operations Director' : data.role === 'TICKET_ONLY' ? 'Ticket Creation Officer' : 'Ticketing Officer'),
        passwordHash,
        status: data.status === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE',
        lastActive: new Date().toISOString()
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        title: true,
        status: true,
        lastActive: true,
        createdAt: true
      }
    });

    await AuditService.recordLog({
      user: currentUser.name || 'Admin',
      userId: currentUser.id,
      action: 'CREATE_EMPLOYEE',
      description: `Created new employee account for ${newUser.name} (${newUser.email}, Role: ${newUser.role}).`
    });

    return {
      ...newUser,
      ticketsCount: 0,
      sales: 0,
      collected: 0,
      refunds: 0,
      outstanding: 0,
      isCalculated: true
    };
  },

  /**
   * Updates an existing employee profile or access status (ADMIN only)
   * @param {string} employeeId
   * @param {object} updates
   * @param {object} currentUser
   */
  async updateEmployee(employeeId, updates, currentUser = {}) {
    const prisma = getPrismaClient();
    const existing = await prisma.user.findUnique({ where: { id: employeeId } });
    if (!existing) {
      throw new NotFoundError('Employee', employeeId);
    }

    // Security Guard: Prevent Administrator from demoting their own role
    if (currentUser.id === employeeId && updates.role && updates.role !== 'ADMIN') {
      throw new BusinessRuleError(
        'Administrators cannot demote their own role to prevent system lockout.',
        'CANNOT_DEMOTE_SELF'
      );
    }

    // Security Guard: Prevent demoting or deactivating the last active Administrator
    const isDemotingAdmin = existing.role === 'ADMIN' && updates.role && updates.role !== 'ADMIN';
    const isDeactivatingAdmin = existing.role === 'ADMIN' && updates.status === 'INACTIVE';
    if (isDemotingAdmin || isDeactivatingAdmin) {
      const activeAdminCount = await prisma.user.count({
        where: { role: 'ADMIN', status: 'ACTIVE' }
      });
      if (activeAdminCount <= 1) {
        throw new BusinessRuleError(
          'Cannot demote or deactivate the last remaining active Administrator.',
          'CANNOT_DEMOTE_LAST_ADMIN'
        );
      }
    }

    const data = {};
    if (updates.name) data.name = updates.name.trim();
    if (updates.role) data.role = ['ADMIN', 'AGENT', 'TICKET_ONLY'].includes(updates.role) ? updates.role : existing.role;
    if (updates.title !== undefined) data.title = updates.title ? updates.title.trim() : '';
    if (updates.status) data.status = updates.status === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE';

    if (updates.email) {
      const cleanEmail = updates.email.toLowerCase().trim();
      if (cleanEmail !== existing.email) {
        const emailTaken = await prisma.user.findUnique({ where: { email: cleanEmail } });
        if (emailTaken) {
          throw new BusinessRuleError('Email is already in use by another user', 'EMAIL_ALREADY_EXISTS');
        }
        data.email = cleanEmail;
      }
    }

    const oldRole = existing.role;
    const isRoleChange = Boolean(data.role && data.role !== oldRole);

    const updated = await prisma.user.update({
      where: { id: employeeId },
      data,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        title: true,
        status: true,
        lastActive: true,
        createdAt: true
      }
    });

    if (isRoleChange) {
      await AuditService.recordLog({
        user: currentUser.name || 'Admin',
        userId: currentUser.id || null,
        action: 'CHANGE_EMPLOYEE_ROLE',
        description: `Admin ${currentUser.name || 'Admin'} changed role for employee ${updated.name} (${updated.id}) from ${oldRole} to ${updated.role}.`,
        metadata: {
          adminId: currentUser.id,
          targetId: updated.id,
          targetType: 'EMPLOYEE',
          employeeName: updated.name,
          oldRole,
          newRole: updated.role
        }
      });
    } else {
      await AuditService.recordLog({
        user: currentUser.name || 'Admin',
        userId: currentUser.id || null,
        action: 'UPDATE_EMPLOYEE',
        description: `Updated employee profile for ${updated.name} (${updated.id}).`,
        metadata: {
          adminId: currentUser.id,
          targetId: updated.id,
          targetType: 'EMPLOYEE',
          employeeName: updated.name,
          updatedFields: Object.keys(data)
        }
      });
    }

    return this.getEmployeeById(employeeId);
  },

  /**
   * Permanently deletes an employee account (ADMIN only)
   * Historical records survive via ON DELETE SET NULL on FK columns;
   * human-readable snapshot fields (createdBy, addedBy, processedBy) are retained.
   * Refresh tokens are cascade-deleted, immediately revoking all sessions.
   *
   * @param {string} employeeId
   * @param {object} currentUser - the admin performing the deletion
   * @param {string} confirmEmployeeId - typed confirmation of employee ID
   */
  async deleteEmployee(employeeId, currentUser = {}, confirmEmployeeId) {
    const prisma = getPrismaClient();

    const existing = await prisma.user.findUnique({ where: { id: employeeId } });
    if (!existing) {
      throw new NotFoundError('Employee', employeeId);
    }

    // Safety Guard: Prevent administrator from deleting their own account
    if (currentUser.id === employeeId) {
      throw new BusinessRuleError(
        'Administrators cannot delete their own account. Ask another administrator to do it.',
        'CANNOT_DELETE_SELF'
      );
    }

    // Safety Guard: Prevent deleting the last remaining active Administrator
    if (existing.role === 'ADMIN') {
      const activeAdminCount = await prisma.user.count({
        where: { role: 'ADMIN', status: 'ACTIVE' }
      });
      if (activeAdminCount <= 1) {
        throw new BusinessRuleError(
          'Cannot delete the last remaining active Administrator.',
          'CANNOT_DELETE_LAST_ADMIN'
        );
      }
    }

    // Confirmation check — must match exact employee ID
    if (!confirmEmployeeId || confirmEmployeeId.trim() !== existing.id) {
      throw new ValidationError(
        `Confirmation failed: confirmEmployeeId must match the exact employee ID '${existing.id}'.`,
        'confirmEmployeeId',
        { expected: existing.id, received: confirmEmployeeId }
      );
    }

    const executeDeletion = async (tx) => {
      // Write audit log BEFORE deleting the employee
      if (tx.auditLog && typeof tx.auditLog.create === 'function') {
        try {
          await tx.auditLog.create({
            data: {
              id: `ACT-${crypto.randomUUID()}`,
              user: currentUser.name || 'Admin',
              userId: currentUser.id || null,
              action: 'DELETE_EMPLOYEE',
              description: `Admin ${currentUser.name || 'Admin'} permanently deleted employee account ${existing.name} (${existing.email}, Role: ${existing.role}).`,
              metadata: {
                adminId: currentUser.id,
                targetId: existing.id,
                targetType: 'EMPLOYEE',
                employeeName: existing.name,
                employeeEmail: existing.email,
                deletedRole: existing.role
              }
            }
          });
        } catch (_) {}
      }

      // Hard delete — FKs are ON DELETE SET NULL / CASCADE
      await tx.user.delete({ where: { id: employeeId } });

      return { deleted: true, id: employeeId };
    };

    let result;
    if (typeof prisma.$transaction === 'function') {
      result = await prisma.$transaction(executeDeletion);
    } else {
      result = await executeDeletion(prisma);
    }

    return result;
  }
};

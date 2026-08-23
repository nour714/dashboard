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

    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(data.password, saltRounds);
    const newId = `EMP-${Math.floor(100 + Math.random() * 900)}`;

    const newUser = await prisma.user.create({
      data: {
        id: newId,
        name: data.name.trim(),
        email: cleanEmail,
        role: ['ADMIN', 'AGENT', 'TICKET_ONLY'].includes(data.role) ? data.role : 'AGENT',
        title: data.title || (data.role === 'ADMIN' ? 'Operations Director' : data.role === 'TICKET_ONLY' ? 'Ticket Creation Officer' : 'Ticketing Officer'),
        passwordHash,
        status: data.status === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE',
        lastActive: 'Just now'
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
   * Updates an existing employee profile or access status
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

    const data = {};
    if (updates.name) data.name = updates.name.trim();
    if (updates.role) data.role = ['ADMIN', 'AGENT', 'TICKET_ONLY'].includes(updates.role) ? updates.role : 'AGENT';
    if (updates.title) data.title = updates.title;
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

    if (updates.password) {
      data.passwordHash = await bcrypt.hash(updates.password, 10);
    }

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

    await AuditService.recordLog({
      user: currentUser.name || 'Admin',
      userId: currentUser.id,
      action: 'UPDATE_EMPLOYEE',
      description: `Updated employee profile for ${updated.name} (${updated.id}).`
    });

    return this.getEmployeeById(employeeId);
  }
};

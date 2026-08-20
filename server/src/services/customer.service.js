/**
 * AfricaTravel - Customer CRM Service
 *
 * Manages customer directory, note threads, and dynamic lifetime financial accounting.
 */

import { getPrismaClient } from '../config/database.js';
import { calculateTotalPaid, calculateRemaining, calculateTotalRefunded } from '../domain/ticket-rules.js';
import { ValidationError, NotFoundError } from '../domain/errors.js';
import { AuditService } from './audit.service.js';
import { enrichTicketFinancials } from './ticket.service.js';

export const CustomerService = {
  /**
   * Retrieves all customers matching an optional search query
   * @param {string} query
   */
  async getCustomers(query = '') {
    const prisma = getPrismaClient();
    const where = {};

    if (query && query.trim()) {
      const q = query.trim();
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { email: { contains: q, mode: 'insensitive' } },
        { phone: { contains: q, mode: 'insensitive' } },
        { passport: { contains: q, mode: 'insensitive' } },
        { id: { contains: q, mode: 'insensitive' } }
      ];
    }

    return prisma.customer.findMany({
      where,
      include: {
        notes: { orderBy: { date: 'desc' } }
      },
      orderBy: { createdAt: 'desc' }
    });
  },

  /**
   * Retrieves customer by ID with full lifetime statistical breakdown
   * @param {string} customerId
   */
  async getCustomerById(customerId) {
    if (!customerId) return null;
    const prisma = getPrismaClient();

    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
      include: {
        notes: { orderBy: { date: 'desc' } },
        tickets: {
          include: {
            payments: true,
            modifications: true,
            refunds: true
          },
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!customer) return null;

    let totalSpent = 0;
    let totalPaid = 0;
    let totalRefunded = 0;
    let totalOutstanding = 0;

    const enrichedTickets = (customer.tickets || []).map(t => {
      const enriched = enrichTicketFinancials(t);
      const price = Number(t.ticketPrice) || 0;
      const paid = calculateTotalPaid(t.payments || []);
      const ref = calculateTotalRefunded(t.refunds || []);

      totalSpent += price;
      totalPaid += paid;
      totalRefunded += ref;
      totalOutstanding += calculateRemaining(price, paid);

      return enriched;
    });

    return {
      ...customer,
      stats: {
        ticketCount: enrichedTickets.length,
        totalSpent,
        totalPaid,
        totalRefunded,
        totalOutstanding
      },
      tickets: enrichedTickets
    };
  },

  /**
   * Creates a new customer record
   * @param {object} data
   * @param {object} currentUser
   */
  async createCustomer(data, currentUser = {}) {
    if (!data.name || !data.name.trim()) {
      throw new ValidationError('Customer name is required', 'name');
    }

    const prisma = getPrismaClient();
    const newId = `CUST-${Math.floor(8900 + Math.random() * 1000)}`;

    const newCustomer = await prisma.customer.create({
      data: {
        id: newId,
        name: data.name.trim(),
        email: data.email ? data.email.trim() : null,
        phone: data.phone ? data.phone.trim() : null,
        passport: data.passport ? data.passport.trim() : null,
        nationality: data.nationality || 'Egyptian (EGY)',
        isVip: Boolean(data.isVip),
        memberSince: String(new Date().getFullYear()),
        notes: data.initialNote && data.initialNote.trim() ? {
          create: {
            author: currentUser.name || 'Agent',
            text: data.initialNote.trim(),
            date: new Date()
          }
        } : undefined
      },
      include: {
        notes: true
      }
    });

    await AuditService.recordLog({
      user: currentUser.name || 'Agent',
      userId: currentUser.id,
      action: 'CREATE_CUSTOMER',
      customerId: newCustomer.id,
      description: `Created new customer record for ${newCustomer.name} (${newCustomer.id}).`
    });

    return newCustomer;
  },

  /**
   * Updates an existing customer profile
   * @param {string} customerId
   * @param {object} updates
   * @param {object} currentUser
   */
  async updateCustomer(customerId, updates, currentUser = {}) {
    const prisma = getPrismaClient();
    const existing = await prisma.customer.findUnique({ where: { id: customerId } });
    if (!existing) {
      throw new NotFoundError('Customer', customerId);
    }

    const data = {};
    if (updates.name !== undefined) data.name = updates.name.trim();
    if (updates.email !== undefined) data.email = updates.email ? updates.email.trim() : null;
    if (updates.phone !== undefined) data.phone = updates.phone ? updates.phone.trim() : null;
    if (updates.passport !== undefined) data.passport = updates.passport ? updates.passport.trim() : null;
    if (updates.nationality !== undefined) data.nationality = updates.nationality;
    if (updates.isVip !== undefined) data.isVip = Boolean(updates.isVip);

    const updated = await prisma.customer.update({
      where: { id: customerId },
      data,
      include: {
        notes: { orderBy: { date: 'desc' } }
      }
    });

    await AuditService.recordLog({
      user: currentUser.name || 'Agent',
      userId: currentUser.id,
      action: 'UPDATE_CUSTOMER',
      customerId,
      description: `Updated profile details for customer ${updated.name} (${updated.id}).`
    });

    return updated;
  },

  /**
   * Adds a CRM note to a customer profile
   * @param {string} customerId
   * @param {string} text
   * @param {object} currentUser
   */
  async addNote(customerId, text, currentUser = {}) {
    if (!text || !text.trim()) {
      throw new ValidationError('Note text cannot be empty', 'text');
    }

    const prisma = getPrismaClient();
    const customer = await prisma.customer.findUnique({ where: { id: customerId } });
    if (!customer) {
      throw new NotFoundError('Customer', customerId);
    }

    const note = await prisma.customerNote.create({
      data: {
        customerId,
        author: currentUser.name || 'Agent',
        text: text.trim(),
        date: new Date()
      }
    });

    await AuditService.recordLog({
      user: currentUser.name || 'Agent',
      userId: currentUser.id,
      action: 'UPDATE_CUSTOMER',
      customerId,
      description: `Added note to customer ${customer.name}.`
    });

    return note;
  }
};

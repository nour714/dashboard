/**
 * AfricaTravel - Ticket, Payment, Modification, and Refund Service
 *
 * Enforces strict domain validation boundaries: No DB mutation occurs without
 * validating business rules and calculations first.
 */

import crypto from 'crypto';
import { getPrismaClient } from '../config/database.js';
import {
  calculateTotalPaid,
  calculateRemaining,
  calculateTotalModificationFees,
  calculateTotalRefunded,
  calculateAvailableRefund,
  calculateNetValue,
  calculateNetProfit,
  derivePaymentStatus,
  validateTicketCreation
} from '../domain/ticket-rules.js';
import { validatePayment } from '../domain/payment-rules.js';
import { validateRefund } from '../domain/refund-rules.js';
import { validateModification } from '../domain/modification-rules.js';
import { NotFoundError, BusinessRuleError, ValidationError, ForbiddenError } from '../domain/errors.js';
import { AuditService } from './audit.service.js';

/**
 * Computes financial ledger balance properties for a ticket object
 * @param {object} ticket
 * @returns {object}
 */
export function enrichTicketFinancials(ticket) {
  if (!ticket) return null;

  const totalPaid = calculateTotalPaid(ticket.payments || []);
  const remaining = calculateRemaining(ticket.ticketPrice, totalPaid);
  const modificationFees = calculateTotalModificationFees(ticket.modifications || []);
  const totalRefunded = calculateTotalRefunded(ticket.refunds || []);
  const availableRefund = calculateAvailableRefund(totalPaid, totalRefunded);
  const netValue = calculateNetValue(ticket.ticketPrice, modificationFees, totalRefunded);
  const paymentStatus = derivePaymentStatus(ticket.ticketPrice, totalPaid, ticket.status);
  const costPrice = ticket.costPrice !== null && ticket.costPrice !== undefined ? Number(ticket.costPrice) : null;
  const netProfit = calculateNetProfit(ticket.ticketPrice, costPrice);

  return {
    ...ticket,
    ticketPrice: Number(ticket.ticketPrice),
    costPrice,
    netProfit,
    financials: {
      ticketPrice: Number(ticket.ticketPrice),
      costPrice,
      netProfit,
      totalPaid,
      remaining,
      modificationFees,
      totalRefunded,
      availableRefund,
      netValue,
      paymentStatus,
      currency: ticket.currency || 'EGP'
    }
  };
}

export const TicketService = {
  /**
   * Lists tickets with search, filtering, and pagination
   * @param {{ search?: string, status?: string, airline?: string, travelDate?: string, page?: number, limit?: number }} filters
   */
  async getTickets(filters = {}) {
    const prisma = getPrismaClient();
    const where = {};

    if (!filters.includeDeleted) {
      where.deletedAt = null;
    }

    const conditions = [];

    if (filters.search) {
      const q = filters.search.trim();
      conditions.push({
        OR: [
          { id: { contains: q, mode: 'insensitive' } },
          { ticketNumber: { contains: q, mode: 'insensitive' } },
          { pnr: { contains: q, mode: 'insensitive' } },
          { passengerName: { contains: q, mode: 'insensitive' } },
          { phone: { contains: q, mode: 'insensitive' } },
          { passport: { contains: q, mode: 'insensitive' } },
          { airline: { contains: q, mode: 'insensitive' } },
          { origin: { contains: q, mode: 'insensitive' } },
          { destination: { contains: q, mode: 'insensitive' } }
        ]
      });
    }

    if (filters.airline && filters.airline !== 'All' && filters.airline !== 'All Airlines') {
      conditions.push({
        OR: [
          { airline: filters.airline },
          { airlineCode: filters.airline }
        ]
      });
    }

    if (conditions.length > 0) {
      where.AND = conditions;
    }

    if (filters.status && filters.status !== 'All' && filters.status !== 'All Statuses') {
      where.status = filters.status;
    }

    if (filters.travelDate) {
      const searchDate = new Date(filters.travelDate);
      if (!isNaN(searchDate.getTime())) {
        const startOfDay = new Date(searchDate.setHours(0, 0, 0, 0));
        const endOfDay = new Date(searchDate.setHours(23, 59, 59, 999));
        where.departureDate = {
          gte: startOfDay,
          lte: endOfDay
        };
      }
    }

    const page = Math.max(1, Number(filters.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(filters.limit) || 50));
    const skip = (page - 1) * limit;

    const [total, tickets] = await Promise.all([
      prisma.ticket.count({ where }),
      prisma.ticket.findMany({
        where,
        include: {
          payments: { select: { amount: true, date: true } },
          modifications: { select: { changeFee: true, date: true } },
          refunds: { select: { amount: true, requestedDate: true } },
          customer: { select: { id: true, name: true, phone: true, email: true } }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      })
    ]);

    const enrichedTickets = tickets.map(enrichTicketFinancials);

    return {
      tickets: enrichedTickets,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  },

  /**
   * Retrieves a single ticket by ID, TicketNumber, or PNR
   * @param {string} ticketId
   * @param {boolean} includeDeleted
   */
  async getTicketById(ticketId, includeDeleted = false) {
    if (!ticketId) return null;
    const prisma = getPrismaClient();

    const where = {
      OR: [
        { id: ticketId },
        { ticketNumber: ticketId },
        { pnr: ticketId }
      ]
    };

    if (!includeDeleted) {
      where.deletedAt = null;
    }

    const ticket = await prisma.ticket.findFirst({
      where,
      include: {
        payments: { orderBy: { date: 'asc' } },
        modifications: { orderBy: { date: 'asc' } },
        refunds: { orderBy: { requestedDate: 'asc' } },
        customer: {
          include: {
            notes: { orderBy: { date: 'desc' } }
          }
        }
      }
    });

    if (!ticket) return null;
    return enrichTicketFinancials(ticket);
  },

  /**
   * Issues a new ticket with domain validation and optional initial payment
   * @param {object} data
   * @param {object} currentUser
   */
  async createTicket(data, currentUser = {}) {
    // 1. Mandatory domain validation
    validateTicketCreation(data);

    const prisma = getPrismaClient();

    // Check proactive duplicate PNR or ticketNumber if explicitly provided
    if (data.pnr && data.pnr.trim()) {
      const cleanPnr = data.pnr.trim();
      const existingTicket = await prisma.ticket.findFirst({
        where: {
          pnr: cleanPnr,
          deletedAt: { not: null }
        }
      });
      if (existingTicket) {
        throw new BusinessRuleError('PNR already exists in an archived ticket record', 'DUPLICATE_PNR', 409);
      }
    }

    if (data.ticketNumber && data.ticketNumber.trim()) {
      const cleanTicketNumber = data.ticketNumber.trim();
      const existingTicket = await prisma.ticket.findFirst({
        where: {
          ticketNumber: cleanTicketNumber,
          deletedAt: null
        }
      });
      if (existingTicket) {
        throw new BusinessRuleError('Ticket number already exists', 'DUPLICATE_TICKET_NUMBER', 409);
      }
    }

    // Generate collision-resistant unique IDs
    const newId = `TK-${crypto.randomUUID().substring(0, 8).toUpperCase()}`;
    const ticketNumber = data.ticketNumber ? data.ticketNumber.trim() : `077-${crypto.randomBytes(4).readUInt32BE(0).toString().padEnd(10, '0').slice(0, 10)}`;
    const pnr = data.pnr ? data.pnr.trim() : `PNR${crypto.randomBytes(3).toString('hex').toUpperCase()}`;

    // Find or create customer
    let customerId = data.customerId;

    if (!customerId) {
      // Try to match an existing customer by passport number (most reliable identifier available)
      let matchedCustomer = null;
      if (data.passport && data.passport.trim()) {
        const cleanPassport = data.passport.trim();
        matchedCustomer = await prisma.customer.findFirst({
          where: {
            passport: { equals: cleanPassport, mode: 'insensitive' },
            deletedAt: null
          }
        });
      }

      if (matchedCustomer) {
        customerId = matchedCustomer.id;
      } else {
        // No matching customer found — create one from the passenger details on the ticket form
        const passengerNameSafe = (data.passengerName || 'Guest').trim() || 'Guest';
        try {
          const newCustomer = await prisma.customer.create({
            data: {
              id: `CUST-${crypto.randomUUID().substring(0, 8).toUpperCase()}`,
              name: passengerNameSafe,
              email: data.email ? data.email.trim() : null,
              phone: data.phone ? data.phone.trim() : null,
              passport: data.passport ? data.passport.trim() : null,
              nationality: data.nationality || 'Egyptian (EGY)',
              isVip: false,
              memberSince: String(new Date().getFullYear())
            }
          });
          customerId = newCustomer.id;
        } catch (custErr) {
          if (custErr.code === 'P2002' && data.passport) {
            const existing = await prisma.customer.findFirst({
              where: { passport: data.passport.trim(), deletedAt: null }
            });
            if (existing) {
              customerId = existing.id;
            } else {
              throw custErr;
            }
          } else {
            throw custErr;
          }
        }
      }
    }

    const price = Number(data.ticketPrice) || 0;
    const initialPaymentAmount = Number(data.initialPayment) || 0;
    const paymentStatus = derivePaymentStatus(price, initialPaymentAmount, 'UNPAID');

    // Create ticket in database
    let newTicket;
    try {
      newTicket = await prisma.ticket.create({
      data: {
        id: newId,
        ticketNumber,
        pnr,
        customerId,
        passengerName: (data.passengerName || 'Guest').trim() || 'Guest',
        phone: data.phone || null,
        passport: data.passport || null,
        nationality: data.nationality || 'Egyptian (EGY)',
        dob: data.dob || null,
        email: data.email || null,
        airline: data.airline || 'EgyptAir',
        airlineCode: data.airlineCode || 'MS',
        flightNumber: (data.flightNumber || 'MS 901').trim() || 'MS 901',
        returnFlightNumber: data.returnFlightNumber || null,
        origin: (data.origin || '').trim(),
        originTerminal: data.originTerminal || null,
        originAirportName: data.originAirportName || null,
        destination: (data.destination || '').trim(),
        destinationTerminal: data.destinationTerminal || null,
        destinationAirportName: data.destinationAirportName || null,
        departureDate: data.departureDate ? new Date(data.departureDate) : null,
        arrivalDate: data.arrivalDate ? new Date(data.arrivalDate) : null,
        returnDepartureDate: data.returnDepartureDate ? new Date(data.returnDepartureDate) : null,
        returnArrivalDate: data.returnArrivalDate ? new Date(data.returnArrivalDate) : null,
        tripType: data.tripType || 'One Way',
        flightDuration: data.flightDuration || null,
        cabinClass: data.cabinClass || 'Economy (Y)',
        seat: data.seat || null,
        baggage: data.baggage || null,
        ticketPrice: price,
        costPrice: currentUser?.role === 'ADMIN'
          ? (data.costPrice !== undefined && data.costPrice !== null && data.costPrice !== '' ? Number(data.costPrice) : 0)
          : 0,
        currency: data.currency || 'EGP',
        status: paymentStatus,
        createdBy: currentUser.name || 'Agent',
        createdById: currentUser.id || null,
        payments: initialPaymentAmount > 0 ? {
          create: {
            id: `PAY-${crypto.randomUUID().substring(0, 8).toUpperCase()}`,
            amount: initialPaymentAmount,
            currency: data.currency || 'EGP',
            method: data.paymentMethod || 'Credit Card',
            reference: data.paymentReference || `INIT-${pnr}`,
            date: data.paymentDate ? new Date(data.paymentDate) : new Date(),
            addedBy: currentUser.name || 'Agent',
            addedById: currentUser.id || null,
            notes: 'Initial payment upon ticket issuance'
          }
        } : undefined
      },
      include: {
        payments: true,
        modifications: true,
        refunds: true,
        customer: true
      }
    });
    } catch (err) {
      if (err.code === 'P2002') {
        const target = Array.isArray(err.meta?.target) ? err.meta.target.join(', ') : (err.meta?.target || '');
        if (String(target).includes('pnr')) {
          const archived = pnr ? await prisma.ticket.findFirst({ where: { pnr, deletedAt: { not: null } } }) : null;
          throw new BusinessRuleError(archived ? 'PNR already exists in an archived ticket record' : 'PNR already exists', 'DUPLICATE_PNR', 409);
        }
        if (String(target).includes('ticketNumber')) {
          throw new BusinessRuleError('Ticket number already exists', 'DUPLICATE_TICKET_NUMBER', 409);
        }
      }
      throw err;
    }

    // Record audit log
    await AuditService.recordLog({
      user: currentUser.name || 'Agent',
      userId: currentUser.id,
      action: 'CREATE_TICKET',
      ticketId: newTicket.id,
      customerId: newTicket.customerId,
      description: `Created ticket ${newTicket.id} (${newTicket.origin} ✈ ${newTicket.destination}) for ${newTicket.passengerName}. Total: ${price} ${newTicket.currency}.`
    });

    return enrichTicketFinancials(newTicket);
  },

  /**
   * Updates non-financial details of a ticket
   * @param {string} ticketId
   * @param {object} updates
   * @param {object} currentUser
   */
  async updateTicket(ticketId, updates, currentUser = {}) {
    const prisma = getPrismaClient();
    const existing = await this.getTicketById(ticketId);
    if (!existing) {
      throw new NotFoundError('Ticket', ticketId);
    }

    const data = {};
    const allowedFields = [
      'passengerName', 'pnr', 'ticketNumber', 'phone', 'passport', 'nationality', 'dob', 'email',
      'airline', 'airlineCode', 'flightNumber', 'returnFlightNumber',
      'origin', 'originTerminal', 'originAirportName',
      'destination', 'destinationTerminal', 'destinationAirportName',
      'tripType', 'flightDuration', 'cabinClass', 'seat', 'baggage', 'costPrice', 'status'
    ];

    if (updates.ticketNumber && updates.ticketNumber !== existing.ticketNumber) {
      const duplicate = await prisma.ticket.findFirst({
        where: {
          ticketNumber: updates.ticketNumber,
          id: { not: existing.id }
        }
      });
      if (duplicate) {
        throw new BusinessRuleError('A ticket with this ticket number already exists.', 'DUPLICATE_TICKET_NUMBER');
      }
    }

    if (updates.pnr && updates.pnr !== existing.pnr) {
      const duplicate = await prisma.ticket.findFirst({
        where: {
          pnr: updates.pnr,
          id: { not: existing.id }
        }
      });
      if (duplicate) {
        throw new BusinessRuleError(duplicate.deletedAt ? 'PNR already exists in an archived ticket record' : 'A ticket with this PNR already exists.', 'DUPLICATE_PNR', 409);
      }
    }

    allowedFields.forEach(f => {
      if (updates[f] !== undefined) {
        if (f === 'costPrice') {
          if (currentUser?.role !== 'ADMIN') {
            throw new ForbiddenError('Only administrators can modify ticket cost price', 'FORBIDDEN');
          }
          data[f] = updates[f] !== null && updates[f] !== '' ? Number(updates[f]) : null;
        } else if (f === 'pnr' || f === 'ticketNumber') {
          data[f] = String(updates[f]).trim();
        } else {
          data[f] = updates[f];
        }
      }
    });

    if (updates.departureDate !== undefined) {
      data.departureDate = updates.departureDate ? new Date(updates.departureDate) : null;
    }
    if (updates.arrivalDate !== undefined) {
      data.arrivalDate = updates.arrivalDate ? new Date(updates.arrivalDate) : null;
    }
    if (updates.returnDepartureDate !== undefined) {
      data.returnDepartureDate = updates.returnDepartureDate ? new Date(updates.returnDepartureDate) : null;
    }
    if (updates.returnArrivalDate !== undefined) {
      data.returnArrivalDate = updates.returnArrivalDate ? new Date(updates.returnArrivalDate) : null;
    }

    let updated;
    try {
      updated = await prisma.ticket.update({
        where: { id: existing.id },
        data,
        include: {
          payments: true,
          modifications: true,
          refunds: true,
          customer: true
        }
      });
    } catch (err) {
      if (err.code === 'P2002') {
        const target = Array.isArray(err.meta?.target) ? err.meta.target.join(', ') : (err.meta?.target || '');
        if (String(target).includes('pnr')) {
          const archived = data.pnr ? await prisma.ticket.findFirst({ where: { pnr: data.pnr, deletedAt: { not: null }, id: { not: existing.id } } }) : null;
          throw new BusinessRuleError(archived ? 'PNR already exists in an archived ticket record' : 'PNR already exists', 'DUPLICATE_PNR', 409);
        }
        if (String(target).includes('ticketNumber')) {
          throw new BusinessRuleError('Ticket number already exists', 'DUPLICATE_TICKET_NUMBER', 409);
        }
      }
      throw err;
    }

    await AuditService.recordLog({
      user: currentUser.name || 'Agent',
      userId: currentUser.id,
      action: 'UPDATE_TICKET',
      ticketId: existing.id,
      customerId: existing.customerId,
      description: `Updated details for ticket ${existing.id}.`
    });

    return enrichTicketFinancials(updated);
  },

  /**
   * Records a payment against a ticket (enforcing validatePayment)
   * @param {string} ticketId
   * @param {object} paymentData
   * @param {object} currentUser
   */
  async addPayment(ticketId, paymentData, currentUser = {}) {
    const prisma = getPrismaClient();

    const executeInTransaction = async (tx) => {
      // 1. Atomically fetch fresh ticket record with full financial ledger inside transaction
      const ticket = await tx.ticket.findFirst({
        where: {
          OR: [
            { id: ticketId },
            { ticketNumber: ticketId },
            { pnr: ticketId }
          ],
          deletedAt: null
        },
        include: {
          payments: true,
          modifications: true,
          refunds: true
        }
      });

      if (!ticket) {
        throw new NotFoundError('Ticket', ticketId);
      }

      // 2. Enforce domain validation against fresh transaction snapshot
      validatePayment(ticket, paymentData);

      const paymentAmount = Number(paymentData.amount);
      const newPaymentId = `PAY-${crypto.randomUUID()}`;

      // 3. Insert payment record in DB
      const createdPayment = await tx.payment.create({
        data: {
          id: newPaymentId,
          ticketId: ticket.id,
          amount: paymentAmount,
          currency: paymentData.currency || ticket.currency || 'EGP',
          method: paymentData.method || 'Credit Card',
          reference: paymentData.reference || `REF-${crypto.randomBytes(4).toString('hex').toUpperCase()}`,
          date: paymentData.date ? new Date(paymentData.date) : new Date(),
          addedBy: currentUser.name || 'Agent',
          addedById: currentUser.id || null,
          notes: paymentData.notes || null
        }
      });

      // 4. Recalculate ledger status inside transaction
      const updatedPayments = [...(ticket.payments || []), createdPayment];
      const totalPaid = calculateTotalPaid(updatedPayments);
      const newStatus = derivePaymentStatus(ticket.ticketPrice, totalPaid, ticket.status);

      if (newStatus !== ticket.status) {
        await tx.ticket.update({
          where: { id: ticket.id },
          data: { status: newStatus }
        });
      }

      // 5. Record audit log entry
      if (tx.auditLog && typeof tx.auditLog.create === 'function') {
        try {
          await tx.auditLog.create({
            data: {
              id: `ACT-${crypto.randomUUID()}`,
              user: currentUser.name || 'Agent',
              userId: currentUser.id || null,
              action: 'ADD_PAYMENT',
              ticketId: ticket.id,
              customerId: ticket.customerId,
              description: `Recorded payment of ${paymentAmount.toLocaleString()} ${createdPayment.currency} via ${createdPayment.method} (${createdPayment.reference || newPaymentId}).`
            }
          });
        } catch (_) {}
      }

      return createdPayment;
    };

    if (typeof prisma.$transaction === 'function') {
      return await prisma.$transaction(executeInTransaction, { isolationLevel: 'Serializable' });
    }
    return await executeInTransaction(prisma);
  },

  /**
   * Processes a refund against a ticket (enforcing validateRefund atomically)
   * @param {string} ticketId
   * @param {object} refundData
   * @param {object} currentUser
   */
  async addRefund(ticketId, refundData, currentUser = {}) {
    const prisma = getPrismaClient();

    const executeInTransaction = async (tx) => {
      // 1. Atomically fetch fresh ticket record with full financial ledger inside transaction
      const ticket = await tx.ticket.findFirst({
        where: {
          OR: [
            { id: ticketId },
            { ticketNumber: ticketId },
            { pnr: ticketId }
          ],
          deletedAt: null
        },
        include: {
          payments: true,
          modifications: true,
          refunds: true
        }
      });

      if (!ticket) {
        throw new NotFoundError('Ticket', ticketId);
      }

      // 2. Enforce domain validation against fresh transaction snapshot
      validateRefund(ticket, refundData);

      const refundAmount = Number(refundData.amount);
      const totalPaid = calculateTotalPaid(ticket.payments || []);
      const newRefundId = `RF-${crypto.randomUUID()}`;
      const status = refundData.status || 'COMPLETED';

      // 3. Insert refund record in DB
      const createdRefund = await tx.refund.create({
        data: {
          id: newRefundId,
          ticketId: ticket.id,
          originalAmount: Number(ticket.ticketPrice),
          totalPaid: totalPaid,
          amount: refundAmount,
          currency: refundData.currency || ticket.currency || 'EGP',
          reason: (refundData.reason || '').trim(),
          status: status,
          requestedDate: new Date(),
          processedDate: status === 'COMPLETED' ? new Date() : null,
          processedBy: currentUser.name || 'Agent',
          processedById: currentUser.id || null
        }
      });

      // 4. Update ticket status
      const updatedRefunds = [...(ticket.refunds || []), createdRefund];
      const newTotalRefunded = calculateTotalRefunded(updatedRefunds);
      let newTicketStatus = ticket.status;
      if (status === 'COMPLETED') {
        if (newTotalRefunded >= totalPaid && totalPaid > 0) {
          newTicketStatus = 'REFUNDED';
        } else {
          newTicketStatus = 'PARTIALLY_REFUNDED';
        }
      } else {
        newTicketStatus = 'REFUND REQUESTED';
      }

      await tx.ticket.update({
        where: { id: ticket.id },
        data: { status: newTicketStatus }
      });

      // 5. Record audit log entry
      if (tx.auditLog && typeof tx.auditLog.create === 'function') {
        try {
          await tx.auditLog.create({
            data: {
              id: `ACT-${crypto.randomUUID()}`,
              user: currentUser.name || 'Agent',
              userId: currentUser.id || null,
              action: status === 'COMPLETED' ? 'COMPLETE_REFUND' : 'ADD_REFUND',
              ticketId: ticket.id,
              customerId: ticket.customerId,
              description: `Processed refund of ${refundAmount.toLocaleString()} ${createdRefund.currency} for ${ticket.id}. Reason: ${createdRefund.reason}`
            }
          });
        } catch (_) {}
      }

      return createdRefund;
    };

    if (typeof prisma.$transaction === 'function') {
      return await prisma.$transaction(executeInTransaction, { isolationLevel: 'Serializable' });
    }
    return await executeInTransaction(prisma);
  },

  /**
   * Applies flight schedule modification (enforcing validateModification atomically)
   * @param {string} ticketId
   * @param {object} modData
   * @param {object} currentUser
   */
  async addModification(ticketId, modData, currentUser = {}) {
    const prisma = getPrismaClient();

    const executeInTransaction = async (tx) => {
      const ticket = await tx.ticket.findFirst({
        where: {
          OR: [
            { id: ticketId },
            { ticketNumber: ticketId },
            { pnr: ticketId }
          ],
          deletedAt: null
        },
        include: {
          payments: true,
          modifications: true,
          refunds: true
        }
      });

      if (!ticket) {
        throw new NotFoundError('Ticket', ticketId);
      }

      // Domain validation enforced before DB write
      validateModification(ticket, modData);

      const modIndex = (ticket.modifications?.length || 0) + 1;
      const newModId = `MOD-${crypto.randomUUID()}`;
      const changeFee = Number(modData.changeFee) || 0;

      const originalFlight = {
        flightNumber: ticket.flightNumber,
        date: ticket.departureDate,
        route: `${ticket.origin} ➔ ${ticket.destination}`,
        duration: ticket.flightDuration || '3h 30m'
      };

      const newFlight = {
        flightNumber: modData.flightNumber || ticket.flightNumber,
        date: modData.newDepartureDate || ticket.departureDate,
        route: `${ticket.origin} ➔ ${ticket.destination}`,
        note: modData.note || 'Schedule adjusted'
      };

      const createdMod = await tx.modification.create({
        data: {
          id: newModId,
          ticketId: ticket.id,
          title: `Modification #${modIndex}`,
          originalFlight,
          newFlight,
          changeFee,
          currency: ticket.currency || 'EGP',
          reason: modData.reason || 'Customer requested schedule adjustment',
          requestedBy: modData.requestedBy || ticket.passengerName,
          processedBy: currentUser.name || 'Agent',
          processedById: currentUser.id || null,
          date: new Date(),
          status: 'COMPLETED'
        }
      });

      // Update ticket departure / arrival dates if requested
      const ticketUpdates = {};
      if (modData.newDepartureDate) {
        ticketUpdates.departureDate = new Date(modData.newDepartureDate);
      }
      if (modData.newArrivalDate) {
        ticketUpdates.arrivalDate = new Date(modData.newArrivalDate);
      }

      if (Object.keys(ticketUpdates).length > 0) {
        await tx.ticket.update({
          where: { id: ticket.id },
          data: ticketUpdates
        });
      }

      // Record audit log
      if (tx.auditLog && typeof tx.auditLog.create === 'function') {
        try {
          await tx.auditLog.create({
            data: {
              id: `ACT-${crypto.randomUUID()}`,
              user: currentUser.name || 'Agent',
              userId: currentUser.id || null,
              action: 'MODIFY_FLIGHT',
              ticketId: ticket.id,
              customerId: ticket.customerId,
              description: `Modified flight for ticket ${ticket.id}. Change fee: ${changeFee} ${ticket.currency}. Reason: ${createdMod.reason}`
            }
          });
        } catch (_) {}
      }

      return createdMod;
    };

    if (typeof prisma.$transaction === 'function') {
      return await prisma.$transaction(executeInTransaction, { isolationLevel: 'Serializable' });
    }
    return await executeInTransaction(prisma);
  },

  /**
   * Permanently deletes a ticket and all associated financial records (ADMIN only)
   * while recording a full financial audit log prior to deletion.
   * @param {string} ticketId
   * @param {object} currentUser
   */
  async deleteTicket(ticketId, currentUser = {}) {
    const prisma = getPrismaClient();

    const existing = await prisma.ticket.findFirst({
      where: {
        OR: [{ id: ticketId }, { ticketNumber: ticketId }, { pnr: ticketId }],
        deletedAt: null
      },
      include: { payments: true, refunds: true, modifications: true }
    });

    if (!existing) {
      throw new NotFoundError('Ticket', ticketId);
    }

    const totalPaid = calculateTotalPaid(existing.payments || []);
    const totalRefunded = calculateTotalRefunded(existing.refunds || []);

    const result = await prisma.$transaction(async (tx) => {
      // سجّل كل التفاصيل المالية قبل الحذف — ده الأثر الوحيد اللي هيفضل موجود
      await tx.auditLog.create({
        data: {
          user: currentUser.name || currentUser.email || 'System',
          userId: currentUser.id || null,
          action: 'DELETE_TICKET_WITH_FINANCIALS',
          ticketId: existing.id,
          customerId: existing.customerId,
          description: `Permanently deleted ticket ${existing.ticketNumber} (${existing.passengerName}) along with ${existing.payments.length} payment(s) and ${existing.refunds.length} refund(s). Total paid: ${totalPaid} ${existing.currency}, total refunded: ${totalRefunded} ${existing.currency}.`,
          metadata: {
            adminId: currentUser.id,
            ticketId: existing.id,
            ticketNumber: existing.ticketNumber,
            pnr: existing.pnr,
            passengerName: existing.passengerName,
            customerId: existing.customerId,
            origin: existing.origin,
            destination: existing.destination,
            totalPaid,
            totalRefunded,
            unrefundedBalance: totalPaid - totalRefunded,
            currency: existing.currency,
            payments: (existing.payments || []).map(p => ({ id: p.id, amount: Number(p.amount), method: p.method, createdAt: p.createdAt })),
            refunds: (existing.refunds || []).map(r => ({ id: r.id, amount: Number(r.amount), reason: r.reason, createdAt: r.createdAt })),
            modificationsCount: (existing.modifications || []).length,
            deletedAt: new Date().toISOString()
          }
        }
      });

      // Payment/Refund/Modification عليهم onDelete: Cascade في الـ schema بالفعل
      // فالحذف ده هيمسحهم تلقائيًا مع التذكرة
      await tx.ticket.delete({ where: { id: existing.id } });

      return { deleted: true, ticketId: existing.id, ticketNumber: existing.ticketNumber };
    });

    return result;
  },

  /**
   * Permanently purges (hard-deletes) a ticket (ADMIN only) after verifying:
   * 1. Ticket has already been soft-deleted (deletedAt != null)
   * 2. Ticket has zero financial or modification history (no payments, refunds, or modifications)
   * 3. Double confirmation token matches ticket ID
   * @param {string} ticketId
   * @param {object} currentUser
   * @param {string} confirmTicketId
   */
  async purgeTicket(ticketId, currentUser = {}, confirmTicketId) {
    if (!ticketId) {
      throw new ValidationError('Ticket ID is required', 'ticketId');
    }

    const prisma = getPrismaClient();

    const existing = await prisma.ticket.findFirst({
      where: {
        OR: [
          { id: ticketId },
          { ticketNumber: ticketId },
          { pnr: ticketId }
        ]
      },
      include: {
        payments: true,
        refunds: true,
        modifications: true
      }
    });

    if (!existing) {
      throw new NotFoundError('Ticket', ticketId);
    }

    if (!existing.deletedAt) {
      throw new BusinessRuleError(
        'Ticket must be soft-deleted before it can be permanently purged.',
        'TICKET_NOT_SOFT_DELETED',
        { ticketId: existing.id }
      );
    }

    const hasFinancialHistory =
      (existing.payments && existing.payments.length > 0) ||
      (existing.refunds && existing.refunds.length > 0) ||
      (existing.modifications && existing.modifications.length > 0);

    if (hasFinancialHistory) {
      throw new BusinessRuleError(
        'Cannot permanently purge a ticket with associated financial records (payments, refunds, or modifications).',
        'TICKET_HAS_FINANCIAL_HISTORY',
        {
          ticketId: existing.id,
          paymentsCount: existing.payments?.length || 0,
          refundsCount: existing.refunds?.length || 0,
          modificationsCount: existing.modifications?.length || 0
        }
      );
    }

    if (!confirmTicketId || confirmTicketId.trim() !== existing.id) {
      throw new ValidationError(
        `Confirmation failed: confirmTicketId must match the exact ticket ID '${existing.id}'.`,
        'confirmTicketId',
        { expected: existing.id, received: confirmTicketId }
      );
    }

    const executePurge = async (tx) => {
      if (tx.auditLog && typeof tx.auditLog.create === 'function') {
        try {
          await tx.auditLog.create({
            data: {
              id: `ACT-${crypto.randomUUID()}`,
              user: currentUser.name || 'Admin',
              userId: currentUser.id || null,
              action: 'PURGE_TICKET',
              ticketId: existing.id,
              customerId: existing.customerId,
              description: `Permanently purged ticket ${existing.id} (${existing.ticketNumber}).`,
              metadata: {
                adminId: currentUser.id,
                targetId: existing.id,
                targetType: 'TICKET',
                ticketNumber: existing.ticketNumber,
                pnr: existing.pnr,
                passengerName: existing.passengerName,
                origin: existing.origin,
                destination: existing.destination,
                ticketPrice: Number(existing.ticketPrice),
                currency: existing.currency,
                customerId: existing.customerId,
                createdAt: existing.createdAt,
                purgedAt: new Date().toISOString()
              }
            }
          });
        } catch (_) {}
      }

      await tx.ticket.delete({
        where: { id: existing.id }
      });

      return { id: existing.id, purged: true };
    };

    let result;
    if (typeof prisma.$transaction === 'function') {
      result = await prisma.$transaction(executePurge);
    } else {
      result = await executePurge(prisma);
    }

    return result;
  }
};

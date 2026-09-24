/**
 * AfricaTravel - Ticket, Payment, Modification, and Refund Service
 *
 * Enforces strict domain validation boundaries: No DB mutation occurs without
 * validating business rules and calculations first.
 */

import crypto from 'crypto';
import Decimal from 'decimal.js';
import { getPrismaClient, withSerializableRetry } from '../config/database.js';
import {
  calculateTotalPaid,
  calculateTotalRefunded,
  derivePaymentStatus,
  deriveTicketStatus,
  validateTicketCreation
} from '../domain/ticket-rules.js';
import { computeTicketLedger } from '../domain/ledger.js';
import { asDecimal, moneyNumber } from '../utils/money.js';
import { validatePayment } from '../domain/payment-rules.js';
import { validateRefund } from '../domain/refund-rules.js';
import { validateModification } from '../domain/modification-rules.js';
import { NotFoundError, BusinessRuleError, ValidationError, ForbiddenError } from '../domain/errors.js';
import { AuditService } from './audit.service.js';
import { BulkTicketParserService } from './bulk-ticket-parser.service.js';
import { TicketExtractionService } from './ticket-extraction.service.js';

/**
 * Computes financial ledger balance properties for a ticket object
 * @param {object} ticket
 * @returns {object}
 */
export function enrichTicketFinancials(ticket) {
  if (!ticket) return null;

  const ledger = computeTicketLedger(ticket);
  const costPrice = ticket.costPrice !== null && ticket.costPrice !== undefined ? moneyNumber(ticket.costPrice) : null;
  const airlinePenalty = costPrice !== null
    ? moneyNumber(Decimal.max(0, asDecimal(ticket.costPrice).minus(asDecimal(ledger.totalAirlineRefunded))))
    : 0;
  const customerDeduction = moneyNumber(Decimal.max(0, asDecimal(ledger.totalPaid).minus(asDecimal(ledger.totalRefunded))));

  return {
    ...ticket,
    ticketPrice: moneyNumber(ticket.ticketPrice),
    costPrice,
    netProfit: ledger.netProfit,
    financials: {
      ticketPrice: moneyNumber(ticket.ticketPrice),
      costPrice,
      netProfit: ledger.netProfit,
      totalPaid: ledger.totalPaid,
      remaining: ledger.remaining,
      modificationFees: ledger.modificationFees,
      modificationPaid: ledger.modificationPaid,
      modificationOutstanding: ledger.modificationOutstanding,
      modificationProfit: ledger.modificationProfit,
      totalRefunded: ledger.totalRefunded,
      pendingRefunds: ledger.pendingRefunds,
      availableRefund: ledger.availableRefund,
      totalAirlineRefunded: ledger.totalAirlineRefunded,
      airlinePenalty,
      customerDeduction,
      netValue: ledger.netValue,
      paymentStatus: ledger.paymentStatus,
      currency: ledger.currency
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
          payments: { orderBy: { date: 'asc' } },
          modifications: { orderBy: { date: 'asc' } },
          refunds: { orderBy: { requestedDate: 'asc' } },
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

    // Verify customer exists and is active (not soft-deleted) if customerId is explicitly supplied
    if (data.customerId) {
      const customer = await prisma.customer.findFirst({
        where: { id: data.customerId, deletedAt: null }
      });
      if (!customer) {
        throw new NotFoundError('Customer', data.customerId);
      }
    }

    // Check proactive duplicate ticketNumber if explicitly provided
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
    const ticketNumber = data.ticketNumber && data.ticketNumber.trim() ? data.ticketNumber.trim() : null;
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

    const priceDec = asDecimal(data.ticketPrice || 0);
    const initialPaymentDec = asDecimal(data.initialPayment || 0);
    const paymentStatus = derivePaymentStatus(priceDec, initialPaymentDec, 'UNPAID');

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
        ticketPrice: moneyNumber(priceDec),
        costPrice: currentUser?.role === 'ADMIN' && data.costPrice !== undefined && data.costPrice !== null && data.costPrice !== ''
          ? moneyNumber(data.costPrice)
          : null,
        currency: data.currency || 'EGP',
        status: paymentStatus,
        createdBy: currentUser.name || 'Agent',
        createdById: currentUser.id || null,
        payments: initialPaymentDec.greaterThan(0) ? {
          create: {
            id: `PAY-${crypto.randomUUID().substring(0, 8).toUpperCase()}`,
            amount: moneyNumber(initialPaymentDec),
            type: 'TICKET',
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
          throw new BusinessRuleError('PNR already exists', 'DUPLICATE_PNR', 409);
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
      description: `Created ticket ${newTicket.id} (${newTicket.origin} ✈ ${newTicket.destination}) for ${newTicket.passengerName}. Total: ${priceDec.toFixed(2)} ${newTicket.currency}.`
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
      'tripType', 'flightDuration', 'cabinClass', 'seat', 'baggage'
    ];

    if (updates.ticketNumber && updates.ticketNumber.trim() && updates.ticketNumber.trim() !== existing.ticketNumber) {
      const duplicate = await prisma.ticket.findFirst({
        where: {
          ticketNumber: updates.ticketNumber.trim(),
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
          id: { not: existing.id },
          deletedAt: null
        }
      });
      if (duplicate) {
        throw new BusinessRuleError('A ticket with this PNR already exists.', 'DUPLICATE_PNR', 409);
      }
    }

    // RBAC & Status update guards: only ADMIN can set status manually, and only to CANCELLED or MODIFIED
    if (updates.status !== undefined) {
      if (currentUser?.role !== 'ADMIN') {
        throw new ForbiddenError('Only administrators can update ticket status', 'FORBIDDEN');
      }
      if (!['CANCELLED', 'MODIFIED'].includes(updates.status)) {
        throw new BusinessRuleError(
          'Status can only be set to CANCELLED or MODIFIED manually.',
          'INVALID_STATUS_UPDATE'
        );
      }
      data.status = updates.status;
    }

    // RBAC & Cost price guard: only ADMIN can modify costPrice
    if (updates.costPrice !== undefined) {
      if (currentUser?.role !== 'ADMIN') {
        throw new ForbiddenError('Only administrators can modify ticket cost price', 'FORBIDDEN');
      }
      data.costPrice = updates.costPrice !== null && updates.costPrice !== ''
        ? moneyNumber(updates.costPrice)
        : null;
    }

    // RBAC & Ticket price guard: only ADMIN can modify ticketPrice
    if (updates.ticketPrice !== undefined && updates.ticketPrice !== null && updates.ticketPrice !== '') {
      if (currentUser?.role !== 'ADMIN') {
        throw new ForbiddenError('Only administrators can modify the ticket price', 'FORBIDDEN');
      }
      const totalPaidSoFarDec = asDecimal(calculateTotalPaid(existing.payments || []));
      const newPriceDec = asDecimal(updates.ticketPrice);
      if (newPriceDec.lessThan(totalPaidSoFarDec) && !updates.confirmPriceBelowPaid) {
        throw new BusinessRuleError(
          `Customer has already paid ${totalPaidSoFarDec.toFixed(2)}, which is more than the new price of ${newPriceDec.toFixed(2)}. Confirm to proceed anyway.`,
          'PRICE_BELOW_PAID',
          409
        );
      }
      data.ticketPrice = moneyNumber(newPriceDec);

      // Recompute status when ticketPrice changes (unless status is explicitly set in request)
      if (updates.status === undefined) {
        const hypotheticalTicket = {
          ...existing,
          ...data,
          ticketPrice: moneyNumber(newPriceDec)
        };
        data.status = deriveTicketStatus(hypotheticalTicket);
      }
    }

    allowedFields.forEach(f => {
      if (updates[f] !== undefined) {
        if (f === 'ticketNumber' || f === 'pnr') {
          data[f] = updates[f] && String(updates[f]).trim() ? String(updates[f]).trim() : null;
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
          throw new BusinessRuleError('PNR already exists', 'DUPLICATE_PNR', 409);
        }
        if (String(target).includes('ticketNumber')) {
          throw new BusinessRuleError('Ticket number already exists', 'DUPLICATE_TICKET_NUMBER', 409);
        }
      }
      throw err;
    }

    const changedFieldsSummary = Object.keys(data)
      .filter(f => data[f] !== existing[f] && f !== 'updatedAt')
      .map(f => `${f}: "${existing[f] ?? ''}" → "${data[f] ?? ''}"`)
      .join('; ');

    await AuditService.recordLog({
      user: currentUser.name || 'Agent',
      userId: currentUser.id,
      action: 'UPDATE_TICKET',
      ticketId: existing.id,
      customerId: existing.customerId,
      description: changedFieldsSummary
        ? `Updated ticket ${existing.id}. Changes: ${changedFieldsSummary}`
        : `Updated details for ticket ${existing.id}.`
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

      const paymentAmountDec = asDecimal(paymentData.amount);
      const newPaymentId = `PAY-${crypto.randomUUID()}`;

      // 3. Insert payment record in DB
      const createdPayment = await tx.payment.create({
        data: {
          id: newPaymentId,
          ticketId: ticket.id,
          amount: moneyNumber(paymentAmountDec),
          type: paymentData.type || 'TICKET',
          currency: paymentData.currency || ticket.currency || 'EGP',
          method: paymentData.method || 'Credit Card',
          reference: paymentData.reference || `REF-${crypto.randomBytes(4).toString('hex').toUpperCase()}`,
          date: paymentData.date ? new Date(paymentData.date) : new Date(),
          addedBy: currentUser.name || 'Agent',
          addedById: currentUser.id || null,
          notes: paymentData.notes || null
        }
      });

      // 4. Recalculate ledger status inside transaction using deriveTicketStatus
      const updatedPayments = [...(ticket.payments || []), createdPayment];
      const updatedTicket = { ...ticket, payments: updatedPayments };
      const newStatus = deriveTicketStatus(updatedTicket);

      if (newStatus !== ticket.status && ticket.status !== 'MODIFIED') {
        await tx.ticket.update({
          where: { id: ticket.id },
          data: { status: newStatus }
        });
      }

      // 5. Record audit log entry
      if (tx.auditLog && typeof tx.auditLog.create === 'function') {
        await tx.auditLog.create({
          data: {
            id: `ACT-${crypto.randomUUID()}`,
            user: currentUser.name || 'Agent',
            userId: currentUser.id || null,
            action: 'ADD_PAYMENT',
            ticketId: ticket.id,
            customerId: ticket.customerId,
            description: `Recorded payment of ${paymentAmountDec.toFixed(2)} ${createdPayment.currency} via ${createdPayment.method} (${createdPayment.reference || newPaymentId}).`
          }
        });
      }

      return createdPayment;
    };

    return await withSerializableRetry(async () => {
      if (typeof prisma.$transaction === 'function') {
        return await prisma.$transaction(executeInTransaction, { isolationLevel: 'Serializable' });
      }
      return await executeInTransaction(prisma);
    }, { context: 'addPayment' });
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

      const refundAmountDec = asDecimal(refundData.amount);
      const totalPaid = calculateTotalPaid(ticket.payments || []);
      const newRefundId = `RF-${crypto.randomUUID()}`;
      const status = refundData.status || 'COMPLETED';

      // 3. Insert refund record in DB
      const airlineRefundAmountDec = asDecimal(refundData.airlineRefundAmount || 0);
      const createdRefund = await tx.refund.create({
        data: {
          id: newRefundId,
          ticketId: ticket.id,
          originalAmount: moneyNumber(ticket.ticketPrice),
          totalPaid: moneyNumber(totalPaid),
          amount: moneyNumber(refundAmountDec),
          airlineRefundAmount: moneyNumber(airlineRefundAmountDec),
          currency: refundData.currency || ticket.currency || 'EGP',
          reason: (refundData.reason || '').trim(),
          status: status,
          requestedDate: new Date(),
          processedDate: status === 'COMPLETED' ? new Date() : null,
          processedBy: currentUser.name || 'Agent',
          processedById: currentUser.id || null
        }
      });

      // 4. Update ticket status using deriveTicketStatus and optional cost price
      const updatedRefunds = [...(ticket.refunds || []), { ...createdRefund, isCompletedCancellation: refundData.isCompletedCancellation === true }];
      const updatedTicket = { ...ticket, refunds: updatedRefunds };
      const newTicketStatus = deriveTicketStatus(updatedTicket);

      const ticketUpdates = { status: newTicketStatus };
      if (refundData.costPrice !== undefined && refundData.costPrice !== null && ticket.costPrice == null) {
        ticketUpdates.costPrice = moneyNumber(refundData.costPrice);
      }

      await tx.ticket.update({
        where: { id: ticket.id },
        data: ticketUpdates
      });

      // 5. Record audit log entry
      if (tx.auditLog && typeof tx.auditLog.create === 'function') {
        await tx.auditLog.create({
          data: {
            id: `ACT-${crypto.randomUUID()}`,
            user: currentUser.name || 'Agent',
            userId: currentUser.id || null,
            action: status === 'COMPLETED' ? 'COMPLETE_REFUND' : 'ADD_REFUND',
            ticketId: ticket.id,
            customerId: ticket.customerId,
            description: `Processed refund of ${refundAmountDec.toFixed(2)} ${createdRefund.currency} for ${ticket.id}. Reason: ${createdRefund.reason}`
          }
        });
      }

      return createdRefund;
    };

    return await withSerializableRetry(async () => {
      if (typeof prisma.$transaction === 'function') {
        return await prisma.$transaction(executeInTransaction, { isolationLevel: 'Serializable' });
      }
      return await executeInTransaction(prisma);
    }, { context: 'addRefund' });
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
      const changeFeeDec = asDecimal(modData.changeFee || 0);
      const airlineFeeDec = asDecimal(modData.airlineFee || 0);

      const isRoundTrip = ticket.tripType === 'Round Trip' || Boolean(ticket.returnDepartureDate || ticket.returnFlightNumber);

      const originalFlight = {
        flightNumber: ticket.flightNumber,
        returnFlightNumber: ticket.returnFlightNumber || null,
        date: ticket.departureDate,
        returnDate: ticket.returnDepartureDate || null,
        route: isRoundTrip
          ? `${ticket.origin} ⇄ ${ticket.destination}`
          : `${ticket.origin} ➔ ${ticket.destination}`,
        duration: ticket.flightDuration || '3h 30m'
      };

      const newFlight = {
        flightNumber: modData.flightNumber || ticket.flightNumber,
        returnFlightNumber: modData.returnFlightNumber || ticket.returnFlightNumber || null,
        date: modData.newDepartureDate || ticket.departureDate,
        returnDate: modData.newReturnDepartureDate || ticket.returnDepartureDate || null,
        route: isRoundTrip
          ? `${ticket.origin} ⇄ ${ticket.destination}`
          : `${ticket.origin} ➔ ${ticket.destination}`,
        note: modData.note || 'Schedule adjusted'
      };

      const createdMod = await tx.modification.create({
        data: {
          id: newModId,
          ticketId: ticket.id,
          title: `Modification #${modIndex}`,
          originalFlight,
          newFlight,
          changeFee: moneyNumber(changeFeeDec),
          airlineFee: moneyNumber(airlineFeeDec),
          currency: ticket.currency || 'EGP',
          reason: modData.reason || 'Customer requested schedule adjustment',
          requestedBy: modData.requestedBy || ticket.passengerName,
          processedBy: currentUser.name || 'Agent',
          processedById: currentUser.id || null,
          date: new Date(),
          status: 'COMPLETED'
        }
      });

      // Update ticket departure / return dates and flight numbers if requested
      const ticketUpdates = {};
      if (modData.flightNumber) {
        ticketUpdates.flightNumber = modData.flightNumber;
      }
      if (modData.returnFlightNumber) {
        ticketUpdates.returnFlightNumber = modData.returnFlightNumber;
      }
      if (modData.newDepartureDate) {
        ticketUpdates.departureDate = new Date(modData.newDepartureDate);
      }
      if (modData.newArrivalDate) {
        ticketUpdates.arrivalDate = new Date(modData.newArrivalDate);
      }
      if (modData.newReturnDepartureDate) {
        ticketUpdates.returnDepartureDate = new Date(modData.newReturnDepartureDate);
      }
      if (modData.newReturnArrivalDate) {
        ticketUpdates.returnArrivalDate = new Date(modData.newReturnArrivalDate);
      }

      // Auto-record payment if change fee was collected immediately
      let autoPaymentRecord = null;
      if (modData.collectedNow && changeFeeDec.greaterThan(0)) {
        const newPaymentId = `PAY-${crypto.randomUUID()}`;
        autoPaymentRecord = await tx.payment.create({
          data: {
            id: newPaymentId,
            ticketId: ticket.id,
            amount: moneyNumber(changeFeeDec),
            type: 'MODIFICATION',
            currency: ticket.currency || 'EGP',
            method: modData.paymentMethod || 'Cash',
            reference: `Mod #${modIndex}`,
            date: new Date(),
            addedBy: currentUser.name || 'Agent',
            addedById: currentUser.id || null,
            notes: `Auto-recorded collection for flight modification #${modIndex}`
          }
        });
      }

      // Maintain status consistency
      const updatedModifications = [...(ticket.modifications || []), createdMod];
      const updatedPayments = autoPaymentRecord ? [...(ticket.payments || []), autoPaymentRecord] : (ticket.payments || []);
      const updatedTicket = { ...ticket, modifications: updatedModifications, payments: updatedPayments };
      const derivedStatus = deriveTicketStatus(updatedTicket);
      if (derivedStatus !== ticket.status && ticket.status !== 'MODIFIED') {
        ticketUpdates.status = derivedStatus;
      }

      if (Object.keys(ticketUpdates).length > 0) {
        await tx.ticket.update({
          where: { id: ticket.id },
          data: ticketUpdates
        });
      }

      // Record audit log
      if (tx.auditLog && typeof tx.auditLog.create === 'function') {
        await tx.auditLog.create({
          data: {
            id: `ACT-${crypto.randomUUID()}`,
            user: currentUser.name || 'Agent',
            userId: currentUser.id || null,
            action: 'MODIFY_FLIGHT',
            ticketId: ticket.id,
            customerId: ticket.customerId,
            description: `Modified flight for ticket ${ticket.id}. Change fee: ${changeFeeDec.toFixed(2)} ${ticket.currency}. Reason: ${createdMod.reason}`
          }
        });
      }

      createdMod.autoPayment = autoPaymentRecord || null;
      return createdMod;
    };

    return await withSerializableRetry(async () => {
      if (typeof prisma.$transaction === 'function') {
        return await prisma.$transaction(executeInTransaction, { isolationLevel: 'Serializable' });
      }
      return await executeInTransaction(prisma);
    }, { context: 'addModification' });
  },

  /**
   * Updates refund status (ADMIN only): PENDING -> APPROVED/COMPLETED/REJECTED.
   * Runs in a Serializable transaction with retry and audit logging.
   * @param {string} ticketId
   * @param {string} refundId
   * @param {object} updateData
   * @param {object} currentUser
   */
  async updateRefund(ticketId, refundId, updateData, currentUser = {}) {
    if (currentUser?.role !== 'ADMIN') {
      throw new ForbiddenError('Only administrators can update refund status');
    }

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

      const existingRefund = (ticket.refunds || []).find(r => r.id === refundId);
      if (!existingRefund) {
        throw new NotFoundError('Refund', refundId);
      }

      if (existingRefund.status !== 'PENDING' && existingRefund.status !== 'REQUESTED') {
        throw new BusinessRuleError(
          `Only PENDING refunds can be updated. Current status is ${existingRefund.status}.`,
          'INVALID_REFUND_STATUS'
        );
      }

      const targetStatus = updateData.status;
      if (!['APPROVED', 'COMPLETED', 'REJECTED'].includes(targetStatus)) {
        throw new ValidationError('Status must be APPROVED, COMPLETED, or REJECTED', 'status');
      }

      const updatedRefund = await tx.refund.update({
        where: { id: existingRefund.id },
        data: {
          status: targetStatus,
          processedDate: targetStatus === 'COMPLETED' ? new Date() : existingRefund.processedDate,
          processedBy: currentUser.name || 'Admin',
          processedById: currentUser.id || null
        }
      });

      const updatedRefunds = (ticket.refunds || []).map(r => r.id === refundId ? updatedRefund : r);
      const updatedTicket = { ...ticket, refunds: updatedRefunds };
      const newTicketStatus = deriveTicketStatus(updatedTicket);

      if (newTicketStatus !== ticket.status) {
        await tx.ticket.update({
          where: { id: ticket.id },
          data: { status: newTicketStatus }
        });
      }

      if (tx.auditLog && typeof tx.auditLog.create === 'function') {
        await tx.auditLog.create({
          data: {
            id: `ACT-${crypto.randomUUID()}`,
            user: currentUser.name || 'Admin',
            userId: currentUser.id || null,
            action: 'UPDATE_REFUND_STATUS',
            ticketId: ticket.id,
            customerId: ticket.customerId,
            description: `Updated refund ${refundId} status from ${existingRefund.status} to ${targetStatus}`
          }
        });
      }

      return updatedRefund;
    };

    return await withSerializableRetry(async () => {
      if (typeof prisma.$transaction === 'function') {
        return await prisma.$transaction(executeInTransaction, { isolationLevel: 'Serializable' });
      }
      return await executeInTransaction(prisma);
    }, { context: 'updateRefund' });
  },

  /**
   * Soft-deletes (archives) a ticket, preserving all financial history.
   * Use purgeTicket() for permanent removal of clean records. (ADMIN only)
   * @param {string} ticketId
   * @param {object} currentUser
   * @param {object} [options]
   * @param {boolean} [options.confirmUnrefundedBalance]
   */
  async deleteTicket(ticketId, currentUser = {}, options = {}) {
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
    const unrefundedBalanceDec = asDecimal(totalPaid).minus(asDecimal(totalRefunded));

    if (unrefundedBalanceDec.greaterThan(0) && !options.confirmUnrefundedBalance) {
      throw new BusinessRuleError(
        `Cannot delete ticket with unrefunded balance (${unrefundedBalanceDec.toFixed(2)} ${existing.currency}) without explicit confirmation.`,
        'UNREFUNDED_BALANCE_REQUIRES_CONFIRMATION',
        {
          unrefundedBalance: unrefundedBalanceDec.toNumber(),
          currency: existing.currency,
          totalPaid,
          totalRefunded
        }
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      await tx.auditLog.create({
        data: {
          user: currentUser.name || currentUser.email || 'System',
          userId: currentUser.id || null,
          action: 'DELETE_TICKET_WITH_FINANCIALS',
          ticketId: existing.id,
          customerId: existing.customerId,
          description: `Soft-deleted ticket ${existing.ticketNumber || existing.id} (${existing.passengerName}) preserving ${existing.payments.length} payment(s) and ${existing.refunds.length} refund(s). Total paid: ${totalPaid} ${existing.currency}, total refunded: ${totalRefunded} ${existing.currency}.`,
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
            unrefundedBalance: unrefundedBalanceDec.toNumber(),
            currency: existing.currency,
            payments: (existing.payments || []).map(p => ({ id: p.id, amount: asDecimal(p.amount).toNumber(), method: p.method, createdAt: p.createdAt })),
            refunds: (existing.refunds || []).map(r => ({ id: r.id, amount: asDecimal(r.amount).toNumber(), reason: r.reason, createdAt: r.createdAt })),
            modificationsCount: (existing.modifications || []).length,
            deletedAt: new Date().toISOString()
          }
        }
      });

      // Soft-delete: update deletedAt while preserving financial records
      await tx.ticket.update({
        where: { id: existing.id },
        data: { deletedAt: new Date() }
      });

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
  },

  /**
   * Generates a sample Excel template for bulk ticket upload.
   * @returns {Buffer}
   */
  generateBulkTemplate() {
    return BulkTicketParserService.generateTemplate();
  },

  /**
   * Bulk imports tickets from uploaded spreadsheets (.xlsx, .xls, .csv) or documents (PDF).
   * Automatically detects duplicates, skips them without failing, and returns a detailed report.
   * @param {Array<{buffer: Buffer, originalname: string, mimetype: string}>} files
   * @param {object} currentUser
   * @returns {Promise<object>}
   */
  async bulkImportTickets(files = [], currentUser = {}) {
    if (!Array.isArray(files) || files.length === 0) {
      throw new BusinessRuleError('No files uploaded for bulk import', 'FILES_REQUIRED', 400);
    }

    const prisma = getPrismaClient();
    const imported = [];
    const duplicates = [];
    const errors = [];

    for (const file of files) {
      if (!file || !file.buffer || file.buffer.length === 0) continue;

      const fileName = file.originalname || 'uploaded-file';
      const lowerName = fileName.toLowerCase();
      const mime = file.mimetype || '';

      const isSpreadsheet =
        lowerName.endsWith('.xlsx') ||
        lowerName.endsWith('.xls') ||
        lowerName.endsWith('.csv') ||
        mime.includes('spreadsheet') ||
        mime.includes('excel') ||
        mime.includes('csv');

      let parsedTickets = [];

      try {
        if (isSpreadsheet) {
          parsedTickets = BulkTicketParserService.parseSpreadsheet(file.buffer);
        } else {
          // Document / PDF extraction via Gemini AI
          parsedTickets = await TicketExtractionService.extractMultipleFromDocument(file.buffer, mime);
        }
      } catch (extractErr) {
        errors.push({
          fileName,
          passengerName: '-',
          pnr: '-',
          ticketNumber: '-',
          error: extractErr.message || 'Failed to extract tickets from file'
        });
        continue;
      }

      if (!Array.isArray(parsedTickets) || parsedTickets.length === 0) {
        errors.push({
          fileName,
          passengerName: '-',
          pnr: '-',
          ticketNumber: '-',
          error: 'No readable ticket records found in file'
        });
        continue;
      }

      for (const item of parsedTickets) {
        const cleanTktNum = item.ticketNumber ? String(item.ticketNumber).trim() : null;
        const cleanPnr = item.pnr ? String(item.pnr).trim().toUpperCase() : null;
        const pName = (item.passengerName || 'Guest').trim();

        // 1. Proactive duplicate check (ticketNumber or pnr)
        let duplicateFound = false;
        let dupReason = '';

        if (cleanTktNum) {
          const existingTkt = await prisma.ticket.findFirst({
            where: { ticketNumber: cleanTktNum, deletedAt: null }
          });
          if (existingTkt) {
            duplicateFound = true;
            dupReason = `رقم التذكرة مسجل مسبقاً (${cleanTktNum})`;
          }
        }

        if (!duplicateFound && cleanPnr) {
          const existingPnr = await prisma.ticket.findFirst({
            where: { pnr: cleanPnr, deletedAt: null }
          });
          if (existingPnr) {
            duplicateFound = true;
            dupReason = `رمز الحجز PNR مسجل مسبقاً (${cleanPnr})`;
          }
        }

        if (duplicateFound) {
          duplicates.push({
            fileName,
            passengerName: pName,
            pnr: cleanPnr || '-',
            ticketNumber: cleanTktNum || '-',
            reason: dupReason
          });
          continue;
        }

        // 2. Create the ticket
        try {
          const ticketPayload = {
            ...item,
            passengerName: pName,
            ticketNumber: cleanTktNum,
            pnr: cleanPnr,
            ticketPrice: item.ticketPrice !== undefined ? Number(item.ticketPrice) : 0,
            costPrice: currentUser?.role === 'ADMIN' && item.costPrice !== undefined ? Number(item.costPrice) : null
          };

          const created = await this.createTicket(ticketPayload, currentUser);
          imported.push({
            id: created.id,
            ticketNumber: created.ticketNumber || '-',
            pnr: created.pnr || '-',
            passengerName: created.passengerName,
            airline: created.airline,
            origin: created.origin,
            destination: created.destination,
            fileName
          });
        } catch (createErr) {
          if (createErr.code === 'DUPLICATE_TICKET_NUMBER' || createErr.code === 'P2002') {
            duplicates.push({
              fileName,
              passengerName: pName,
              pnr: cleanPnr || '-',
              ticketNumber: cleanTktNum || '-',
              reason: 'رقم التذكرة أو PNR مسجل مسبقاً'
            });
          } else {
            errors.push({
              fileName,
              passengerName: pName,
              pnr: cleanPnr || '-',
              ticketNumber: cleanTktNum || '-',
              error: createErr.message || 'Validation error'
            });
          }
        }
      }
    }

    const totalProcessed = imported.length + duplicates.length + errors.length;

    return {
      totalProcessed,
      totalImported: imported.length,
      totalDuplicates: duplicates.length,
      totalErrors: errors.length,
      imported,
      duplicates,
      errors
    };
  }
};

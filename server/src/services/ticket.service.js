/**
 * AfricaTravel - Ticket, Payment, Modification, and Refund Service
 *
 * Enforces strict domain validation boundaries: No DB mutation occurs without
 * validating business rules and calculations first.
 */

import { getPrismaClient } from '../config/database.js';
import {
  calculateTotalPaid,
  calculateRemaining,
  calculateTotalModificationFees,
  calculateTotalRefunded,
  calculateAvailableRefund,
  calculateNetValue,
  derivePaymentStatus,
  validateTicketCreation
} from '../domain/ticket-rules.js';
import { validatePayment } from '../domain/payment-rules.js';
import { validateRefund } from '../domain/refund-rules.js';
import { validateModification } from '../domain/modification-rules.js';
import { NotFoundError } from '../domain/errors.js';
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

  return {
    ...ticket,
    ticketPrice: Number(ticket.ticketPrice),
    financials: {
      ticketPrice: Number(ticket.ticketPrice),
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

    if (filters.search) {
      const q = filters.search.trim();
      where.OR = [
        { id: { contains: q, mode: 'insensitive' } },
        { ticketNumber: { contains: q, mode: 'insensitive' } },
        { pnr: { contains: q, mode: 'insensitive' } },
        { passengerName: { contains: q, mode: 'insensitive' } },
        { phone: { contains: q, mode: 'insensitive' } },
        { passport: { contains: q, mode: 'insensitive' } },
        { airline: { contains: q, mode: 'insensitive' } },
        { origin: { contains: q, mode: 'insensitive' } },
        { destination: { contains: q, mode: 'insensitive' } }
      ];
    }

    if (filters.status && filters.status !== 'All' && filters.status !== 'All Statuses') {
      where.status = filters.status;
    }

    if (filters.airline && filters.airline !== 'All' && filters.airline !== 'All Airlines') {
      where.OR = [
        ...(where.OR || []),
        { airline: filters.airline },
        { airlineCode: filters.airline }
      ];
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
          payments: { orderBy: { date: 'desc' } },
          modifications: { orderBy: { date: 'desc' } },
          refunds: { orderBy: { requestedDate: 'desc' } },
          customer: true
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
   */
  async getTicketById(ticketId) {
    if (!ticketId) return null;
    const prisma = getPrismaClient();

    const ticket = await prisma.ticket.findFirst({
      where: {
        OR: [
          { id: ticketId },
          { ticketNumber: ticketId },
          { pnr: ticketId }
        ]
      },
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

    // Generate unique IDs
    const newId = `TK-${Math.floor(10000 + Math.random() * 90000)}`;
    const ticketNumber = data.ticketNumber || `077-${Math.floor(1000000000 + Math.random() * 9000000000)}`;
    const pnr = data.pnr || `PNR${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    // Find or create customer
    let customerId = data.customerId;

    if (!customerId) {
      // Try to match an existing customer by passport number (most reliable identifier available)
      let matchedCustomer = null;
      if (data.passport && data.passport.trim()) {
        matchedCustomer = await prisma.customer.findFirst({
          where: { passport: data.passport.trim() }
        });
      }

      if (matchedCustomer) {
        customerId = matchedCustomer.id;
      } else {
        // No matching customer found — create one from the passenger details on the ticket form
        const newCustomer = await prisma.customer.create({
          data: {
            id: `CUST-${Math.floor(8900 + Math.random() * 1000)}`,
            name: data.passengerName.trim(),
            email: data.email ? data.email.trim() : null,
            phone: data.phone ? data.phone.trim() : null,
            passport: data.passport ? data.passport.trim() : null,
            nationality: data.nationality || 'Egyptian (EGY)',
            isVip: false,
            memberSince: String(new Date().getFullYear())
          }
        });
        customerId = newCustomer.id;
      }
    }

    const price = Number(data.ticketPrice);
    const initialPaymentAmount = Number(data.initialPayment) || 0;
    const paymentStatus = derivePaymentStatus(price, initialPaymentAmount, 'CONFIRMED');

    // Create ticket in database
    const newTicket = await prisma.ticket.create({
      data: {
        id: newId,
        ticketNumber,
        pnr,
        customerId,
        passengerName: data.passengerName.trim(),
        phone: data.phone || null,
        passport: data.passport || null,
        nationality: data.nationality || 'Egyptian (EGY)',
        dob: data.dob || null,
        email: data.email || null,
        airline: data.airline || 'EgyptAir',
        airlineCode: data.airlineCode || 'MS',
        flightNumber: data.flightNumber || 'MS 901',
        returnFlightNumber: data.returnFlightNumber || null,
        origin: data.origin.trim(),
        originTerminal: data.originTerminal || null,
        originAirportName: data.originAirportName || null,
        destination: data.destination.trim(),
        destinationTerminal: data.destinationTerminal || null,
        destinationAirportName: data.destinationAirportName || null,
        departureDate: new Date(data.departureDate),
        arrivalDate: new Date(data.arrivalDate),
        returnDepartureDate: data.returnDepartureDate ? new Date(data.returnDepartureDate) : null,
        returnArrivalDate: data.returnArrivalDate ? new Date(data.returnArrivalDate) : null,
        tripType: data.tripType || 'One Way',
        flightDuration: data.flightDuration || null,
        cabinClass: data.cabinClass || 'Economy (Y)',
        seat: data.seat || null,
        baggage: data.baggage || null,
        ticketPrice: price,
        currency: data.currency || 'EGP',
        status: paymentStatus,
        createdBy: currentUser.name || 'Agent',
        createdById: currentUser.id || null,
        payments: initialPaymentAmount > 0 ? {
          create: {
            id: `PAY-${Date.now()}`,
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
      'passengerName', 'phone', 'passport', 'nationality', 'dob', 'email',
      'airline', 'airlineCode', 'flightNumber', 'returnFlightNumber',
      'origin', 'originTerminal', 'originAirportName',
      'destination', 'destinationTerminal', 'destinationAirportName',
      'tripType', 'flightDuration', 'cabinClass', 'seat', 'baggage', 'status'
    ];

    allowedFields.forEach(f => {
      if (updates[f] !== undefined) {
        data[f] = updates[f];
      }
    });

    if (updates.departureDate) data.departureDate = new Date(updates.departureDate);
    if (updates.arrivalDate) data.arrivalDate = new Date(updates.arrivalDate);
    if (updates.returnDepartureDate) data.returnDepartureDate = new Date(updates.returnDepartureDate);
    if (updates.returnArrivalDate) data.returnArrivalDate = new Date(updates.returnArrivalDate);

    const updated = await prisma.ticket.update({
      where: { id: existing.id },
      data,
      include: {
        payments: true,
        modifications: true,
        refunds: true,
        customer: true
      }
    });

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
    const ticket = await this.getTicketById(ticketId);
    if (!ticket) {
      throw new NotFoundError('Ticket', ticketId);
    }

    // Domain validation enforced before DB write
    validatePayment(ticket, paymentData);

    const paymentAmount = Number(paymentData.amount);
    const newPaymentId = `PAY-${Date.now()}`;

    // Create payment in DB
    const createdPayment = await prisma.payment.create({
      data: {
        id: newPaymentId,
        ticketId: ticket.id,
        amount: paymentAmount,
        currency: paymentData.currency || ticket.currency || 'EGP',
        method: paymentData.method || 'Credit Card',
        reference: paymentData.reference || `REF-${Math.floor(100000 + Math.random() * 900000)}`,
        date: paymentData.date ? new Date(paymentData.date) : new Date(),
        addedBy: currentUser.name || 'Agent',
        addedById: currentUser.id || null,
        notes: paymentData.notes || null
      }
    });

    // Recalculate status from financial ledger
    const updatedPayments = [...(ticket.payments || []), createdPayment];
    const totalPaid = calculateTotalPaid(updatedPayments);
    const newStatus = derivePaymentStatus(ticket.ticketPrice, totalPaid, ticket.status);

    if (newStatus !== ticket.status) {
      await prisma.ticket.update({
        where: { id: ticket.id },
        data: { status: newStatus }
      });
    }

    // Record audit log
    await AuditService.recordLog({
      user: currentUser.name || 'Agent',
      userId: currentUser.id,
      action: 'ADD_PAYMENT',
      ticketId: ticket.id,
      customerId: ticket.customerId,
      description: `Recorded payment of ${paymentAmount.toLocaleString()} ${createdPayment.currency} via ${createdPayment.method} (${createdPayment.reference || newPaymentId}).`
    });

    return createdPayment;
  },

  /**
   * Processes a refund against a ticket (enforcing validateRefund)
   * @param {string} ticketId
   * @param {object} refundData
   * @param {object} currentUser
   */
  async addRefund(ticketId, refundData, currentUser = {}) {
    const prisma = getPrismaClient();
    const ticket = await this.getTicketById(ticketId);
    if (!ticket) {
      throw new NotFoundError('Ticket', ticketId);
    }

    // Domain validation enforced before DB write
    validateRefund(ticket, refundData);

    const refundAmount = Number(refundData.amount);
    const totalPaid = calculateTotalPaid(ticket.payments || []);
    const newRefundId = `RF-${Math.floor(9000 + Math.random() * 1000)}`;

    const status = refundData.status || 'COMPLETED';

    const createdRefund = await prisma.refund.create({
      data: {
        id: newRefundId,
        ticketId: ticket.id,
        originalAmount: Number(ticket.ticketPrice),
        totalPaid: totalPaid,
        amount: refundAmount,
        currency: refundData.currency || ticket.currency || 'EGP',
        reason: refundData.reason.trim(),
        status: status,
        requestedDate: new Date(),
        processedDate: status === 'COMPLETED' ? new Date() : null,
        processedBy: currentUser.name || 'Agent',
        processedById: currentUser.id || null
      }
    });

    // Update ticket status
    const newTicketStatus = status === 'COMPLETED' ? 'REFUNDED' : 'REFUND REQUESTED';
    await prisma.ticket.update({
      where: { id: ticket.id },
      data: { status: newTicketStatus }
    });

    // Record audit log
    await AuditService.recordLog({
      user: currentUser.name || 'Agent',
      userId: currentUser.id,
      action: status === 'COMPLETED' ? 'COMPLETE_REFUND' : 'ADD_REFUND',
      ticketId: ticket.id,
      customerId: ticket.customerId,
      description: `Processed refund of ${refundAmount.toLocaleString()} ${createdRefund.currency} for ${ticket.id}. Reason: ${createdRefund.reason}`
    });

    return createdRefund;
  },

  /**
   * Applies flight schedule modification (enforcing validateModification)
   * @param {string} ticketId
   * @param {object} modData
   * @param {object} currentUser
   */
  async addModification(ticketId, modData, currentUser = {}) {
    const prisma = getPrismaClient();
    const ticket = await this.getTicketById(ticketId);
    if (!ticket) {
      throw new NotFoundError('Ticket', ticketId);
    }

    // Domain validation enforced before DB write
    validateModification(ticket, modData);

    const modIndex = (ticket.modifications?.length || 0) + 1;
    const newModId = `MOD-${Date.now()}`;
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

    const createdMod = await prisma.modification.create({
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
      await prisma.ticket.update({
        where: { id: ticket.id },
        data: ticketUpdates
      });
    }

    // Record audit log
    await AuditService.recordLog({
      user: currentUser.name || 'Agent',
      userId: currentUser.id,
      action: 'MODIFY_FLIGHT',
      ticketId: ticket.id,
      customerId: ticket.customerId,
      description: `Modified flight for ticket ${ticket.id}. Change fee: ${changeFee} ${ticket.currency}. Reason: ${createdMod.reason}`
    });

    return createdMod;
  }
};

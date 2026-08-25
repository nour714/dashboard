/**
 * AfricaTravel - Ticket, Payment, Refund, and Modification Controller
 */

import { TicketService } from '../services/ticket.service.js';
import { NotFoundError, ForbiddenError } from '../domain/errors.js';

export const TicketController = {
  async getTickets(req, res, next) {
    try {
      const result = await TicketService.getTickets(req.query);
      return res.status(200).json({
        success: true,
        data: result
      });
    } catch (err) {
      next(err);
    }
  },

  async getTicketById(req, res, next) {
    try {
      const ticket = await TicketService.getTicketById(req.params.id);
      if (!ticket) {
        throw new NotFoundError('Ticket', req.params.id);
      }
      if (req.user && req.user.role === 'TICKET_ONLY') {
        if (ticket.createdById !== req.user.id) {
          throw new ForbiddenError('Access restricted to your own tickets');
        }
      }
      return res.status(200).json({
        success: true,
        data: ticket
      });
    } catch (err) {
      next(err);
    }
  },

  async createTicket(req, res, next) {
    try {
      const ticket = await TicketService.createTicket(req.body, req.user);
      return res.status(201).json({
        success: true,
        data: ticket
      });
    } catch (err) {
      next(err);
    }
  },

  async updateTicket(req, res, next) {
    try {
      const ticket = await TicketService.updateTicket(req.params.id, req.body, req.user);
      return res.status(200).json({
        success: true,
        data: ticket
      });
    } catch (err) {
      next(err);
    }
  },

  async addPayment(req, res, next) {
    try {
      const payment = await TicketService.addPayment(req.params.id, req.body, req.user);
      return res.status(201).json({
        success: true,
        data: payment
      });
    } catch (err) {
      next(err);
    }
  },

  async addRefund(req, res, next) {
    try {
      const refund = await TicketService.addRefund(req.params.id, req.body, req.user);
      return res.status(201).json({
        success: true,
        data: refund
      });
    } catch (err) {
      next(err);
    }
  },

  async addModification(req, res, next) {
    try {
      const mod = await TicketService.addModification(req.params.id, req.body, req.user);
      return res.status(201).json({
        success: true,
        data: mod
      });
    } catch (err) {
      next(err);
    }
  },

  async deleteTicket(req, res, next) {
    try {
      const result = await TicketService.deleteTicket(req.params.id, req.user);
      return res.status(200).json({
        success: true,
        message: 'Ticket deleted successfully',
        data: result
      });
    } catch (err) {
      next(err);
    }
  },

  async purgeTicket(req, res, next) {
    try {
      const confirmTicketId = req.body?.confirmTicketId;
      const result = await TicketService.purgeTicket(req.params.id, req.user, confirmTicketId);
      return res.status(200).json({
        success: true,
        message: 'Ticket permanently purged',
        data: result
      });
    } catch (err) {
      next(err);
    }
  }
};

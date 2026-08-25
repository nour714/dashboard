/**
 * AfricaTravel - Ticket, Payment, Refund, and Modification Routes
 */

import { Router } from 'express';
import { TicketController } from '../controllers/ticket.controller.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import {
  createTicketSchema,
  updateTicketSchema,
  queryTicketsSchema,
  addPurgeConfirmSchema
} from '../schemas/ticket.schema.js';
import { addPaymentSchema } from '../schemas/payment.schema.js';
import { addRefundSchema } from '../schemas/refund.schema.js';
import { addModificationSchema } from '../schemas/modification.schema.js';

const router = Router();

// All ticket endpoints require authentication
router.use(authenticate);

// Ticket CRUD
router.get('/', requireRole('ADMIN', 'AGENT'), validate({ query: queryTicketsSchema }), TicketController.getTickets);
router.get('/:id', requireRole('ADMIN', 'AGENT', 'TICKET_ONLY'), TicketController.getTicketById);
router.post('/', requireRole('ADMIN', 'AGENT', 'TICKET_ONLY'), validate({ body: createTicketSchema }), TicketController.createTicket);
router.patch('/:id', requireRole('ADMIN', 'AGENT'), validate({ body: updateTicketSchema }), TicketController.updateTicket);
router.delete('/:id', requireRole('ADMIN'), TicketController.deleteTicket);
router.delete('/:id/purge', requireRole('ADMIN'), validate({ body: addPurgeConfirmSchema }), TicketController.purgeTicket);

// Financial & Operational Ledger Sub-resources (Enforce Domain Validation Layer)
router.post('/:id/payments', requireRole('ADMIN', 'AGENT'), validate({ body: addPaymentSchema }), TicketController.addPayment);
router.post('/:id/refunds', requireRole('ADMIN'), validate({ body: addRefundSchema }), TicketController.addRefund);
router.post('/:id/modifications', requireRole('ADMIN', 'AGENT'), validate({ body: addModificationSchema }), TicketController.addModification);

export default router;

/**
 * AfricaTravel - Ticket, Payment, Refund, and Modification Routes
 */

import { Router } from 'express';
import { TicketController } from '../controllers/ticket.controller.js';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import {
  createTicketSchema,
  updateTicketSchema,
  queryTicketsSchema
} from '../schemas/ticket.schema.js';
import { addPaymentSchema } from '../schemas/payment.schema.js';
import { addRefundSchema } from '../schemas/refund.schema.js';
import { addModificationSchema } from '../schemas/modification.schema.js';

const router = Router();

// All ticket endpoints require authentication
router.use(authenticate);

// Ticket CRUD
router.get('/', validate({ query: queryTicketsSchema }), TicketController.getTickets);
router.get('/:id', TicketController.getTicketById);
router.post('/', validate({ body: createTicketSchema }), TicketController.createTicket);
router.patch('/:id', validate({ body: updateTicketSchema }), TicketController.updateTicket);

// Financial & Operational Ledger Sub-resources (Enforce Domain Validation Layer)
router.post('/:id/payments', validate({ body: addPaymentSchema }), TicketController.addPayment);
router.post('/:id/refunds', validate({ body: addRefundSchema }), TicketController.addRefund);
router.post('/:id/modifications', validate({ body: addModificationSchema }), TicketController.addModification);

export default router;

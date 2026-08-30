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
import { passportDocUpload } from '../middleware/upload.js';
import { uploadRateLimiter } from '../middleware/rate-limiter.js';
import { TicketExtractionService } from '../services/ticket-extraction.service.js';

const router = Router();

// All ticket endpoints require authentication
router.use(authenticate);

// AI Ticket Extraction from Document (PDF/Image)
router.post(
  '/extract-from-document',
  requireRole('ADMIN', 'AGENT', 'TICKET_ONLY'),
  uploadRateLimiter,
  passportDocUpload.single('document'),
  async (req, res, next) => {
    try {
      if (!req.file) {
        return res.status(400).json({ success: false, error: { message: 'No file uploaded', code: 'FILE_REQUIRED' } });
      }
      const extracted = await TicketExtractionService.extractFromDocument(req.file.buffer, req.file.mimetype);
      return res.status(200).json({ success: true, data: extracted });
    } catch (err) {
      next(err);
    }
  }
);

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

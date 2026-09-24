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
import { addRefundSchema, updateRefundSchema } from '../schemas/refund.schema.js';
import { addModificationSchema } from '../schemas/modification.schema.js';
import { passportDocUpload, bulkTicketUpload, uploadConcurrencyBudget, aiExtractionConcurrencyBudget } from '../middleware/upload.js';
import { uploadRateLimiter } from '../middleware/rate-limiter.js';
import { env } from '../config/env.js';
import { TicketExtractionService } from '../services/ticket-extraction.service.js';

const router = Router();

// All ticket endpoints require authentication
router.use(authenticate);

// AI Connectivity Diagnostic Endpoint (ADMIN only)
router.get(
  '/ai-test',
  requireRole('ADMIN'),
  async (req, res) => {
    const key = env.GEMINI_API_KEY || '';
    if (!key) {
      return res.status(200).json({
        success: false,
        configured: false,
        message: 'GEMINI_API_KEY is missing or empty in environment variables. Please configure it in Vercel and Redeploy.'
      });
    }

    const maskedKey = key.length > 8 ? `${key.slice(0, 4)}...${key.slice(-4)}` : '***';
    const modelsToTest = [env.GEMINI_MODEL || 'gemini-1.5-flash', 'gemini-1.5-flash', 'gemini-2.0-flash', 'gemini-2.5-flash'];
    const uniqueModels = Array.from(new Set(modelsToTest));
    const results = [];

    for (const model of uniqueModels) {
      try {
        const testUrl = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;
        const testRes = await fetch(testUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': key
          },
          body: JSON.stringify({
            contents: [{ parts: [{ text: 'hi' }] }]
          })
        });

        const status = testRes.status;
        const text = await testRes.text().catch(() => '');
        let parsedErr = '';
        try {
          const j = JSON.parse(text);
          parsedErr = j.error?.message || '';
        } catch {
          parsedErr = text.slice(0, 200);
        }

        results.push({
          model,
          status,
          ok: testRes.ok,
          message: testRes.ok ? 'Connection successful!' : parsedErr
        });
      } catch (err) {
        results.push({
          model,
          status: 0,
          ok: false,
          message: err.message
        });
      }
    }

    return res.status(200).json({
      success: true,
      configured: true,
      maskedKey,
      results
    });
  }
);

// Download Excel Template for Bulk Import
router.get(
  '/bulk-import/template',
  requireRole('ADMIN', 'AGENT', 'TICKET_ONLY'),
  TicketController.downloadBulkTemplate
);

// Bulk Import Tickets (Excel/CSV or multi-page PDF documents)
router.post(
  '/bulk-import',
  requireRole('ADMIN', 'AGENT', 'TICKET_ONLY'),
  uploadRateLimiter,
  uploadConcurrencyBudget,
  bulkTicketUpload.fields([{ name: 'file', maxCount: 1 }, { name: 'files', maxCount: 50 }]),
  TicketController.bulkImportTickets
);

// AI Ticket Extraction from Document (PDF/Image)
router.post(
  '/extract-from-document',
  requireRole('ADMIN', 'AGENT', 'TICKET_ONLY'),
  uploadRateLimiter,
  uploadConcurrencyBudget,
  aiExtractionConcurrencyBudget,
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
router.patch('/:id/refunds/:refundId', requireRole('ADMIN'), validate({ body: updateRefundSchema }), TicketController.updateRefund);
router.post('/:id/modifications', requireRole('ADMIN', 'AGENT'), validate({ body: addModificationSchema }), TicketController.addModification);

export default router;

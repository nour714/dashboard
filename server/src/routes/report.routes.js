/**
 * AfricaTravel - Report & Business Intelligence Routes
 */

import { Router } from 'express';
import { ReportController } from '../controllers/report.controller.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const router = Router();

router.use(authenticate);

router.get('/summary', requireRole('ADMIN', 'AGENT'), ReportController.getSummary);
router.get('/revenue', requireRole('ADMIN', 'AGENT'), ReportController.getRevenue);
router.get('/airlines', requireRole('ADMIN', 'AGENT'), ReportController.getAirlines);
router.get('/customer-payments', requireRole('ADMIN', 'AGENT'), ReportController.getCustomerPayments);
router.get('/full', requireRole('ADMIN', 'AGENT'), ReportController.getFullReport);

export default router;

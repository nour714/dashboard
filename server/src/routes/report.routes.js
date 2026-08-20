/**
 * AfricaTravel - Report & Business Intelligence Routes
 */

import { Router } from 'express';
import { ReportController } from '../controllers/report.controller.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.use(authenticate);

router.get('/summary', ReportController.getSummary);
router.get('/revenue', ReportController.getRevenue);
router.get('/airlines', ReportController.getAirlines);
router.get('/full', ReportController.getFullReport);

export default router;

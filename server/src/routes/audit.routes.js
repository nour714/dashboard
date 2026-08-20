/**
 * AfricaTravel - Audit Activity Routes
 */

import { Router } from 'express';
import { AuditController } from '../controllers/audit.controller.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.use(authenticate);

router.get('/', AuditController.getLogs);

export default router;

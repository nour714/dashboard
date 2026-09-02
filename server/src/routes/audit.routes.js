/**
 * AfricaTravel - Audit Activity Routes
 */

import { Router } from 'express';
import { AuditController } from '../controllers/audit.controller.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { queryLogsSchema } from '../schemas/audit.schema.js';

const router = Router();

router.use(authenticate);

router.get('/', requireRole('ADMIN', 'AGENT'), validate({ query: queryLogsSchema }), AuditController.getLogs);

export default router;

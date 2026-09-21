/**
 * AfricaTravel — Visas Routes
 */

import { Router } from 'express';
import { VisaController } from '../controllers/visa.controller.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import {
  createVisaSchema,
  queryVisasSchema,
  updateVisaSchema
} from '../schemas/visa.schema.js';

const router = Router();

// All visa endpoints require authentication
router.use(authenticate);

router.get('/', requireRole('ADMIN', 'AGENT'), validate({ query: queryVisasSchema }), VisaController.getVisas);
router.get('/:id', requireRole('ADMIN', 'AGENT'), VisaController.getVisaById);
router.post('/', requireRole('ADMIN', 'AGENT'), validate({ body: createVisaSchema }), VisaController.createVisa);
router.patch('/:id', requireRole('ADMIN', 'AGENT'), validate({ body: updateVisaSchema }), VisaController.updateVisa);
router.delete('/:id', requireRole('ADMIN'), VisaController.deleteVisa);

export default router;

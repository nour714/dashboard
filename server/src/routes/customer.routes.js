/**
 * AfricaTravel - Customer CRM Routes
 */

import { Router } from 'express';
import { CustomerController } from '../controllers/customer.controller.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import {
  createCustomerSchema,
  updateCustomerSchema,
  addCustomerNoteSchema
} from '../schemas/customer.schema.js';
import { passportDocUpload } from '../middleware/upload.js';
import { uploadRateLimiter } from '../middleware/rate-limiter.js';

const router = Router();

router.use(authenticate);

router.get('/', requireRole('ADMIN', 'AGENT'), CustomerController.getCustomers);
router.get('/:id', requireRole('ADMIN', 'AGENT'), CustomerController.getCustomerById);
router.post('/', requireRole('ADMIN', 'AGENT'), validate({ body: createCustomerSchema }), CustomerController.createCustomer);
router.patch('/:id', requireRole('ADMIN', 'AGENT'), validate({ body: updateCustomerSchema }), CustomerController.updateCustomer);
router.post('/:id/notes', requireRole('ADMIN', 'AGENT'), validate({ body: addCustomerNoteSchema }), CustomerController.addNote);

// Passport Document endpoints
router.post('/:id/passport-document', requireRole('ADMIN', 'AGENT'), uploadRateLimiter, passportDocUpload.single('passportDocument'), CustomerController.uploadPassportDocument);
router.get('/:id/passport-document', requireRole('ADMIN', 'AGENT'), CustomerController.getPassportDocument);
router.delete('/:id/passport-document', requireRole('ADMIN'), CustomerController.deletePassportDocument);

export default router;

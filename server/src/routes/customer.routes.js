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

router.get('/', CustomerController.getCustomers);
router.get('/:id', CustomerController.getCustomerById);
router.post('/', validate({ body: createCustomerSchema }), CustomerController.createCustomer);
router.patch('/:id', validate({ body: updateCustomerSchema }), CustomerController.updateCustomer);
router.post('/:id/notes', validate({ body: addCustomerNoteSchema }), CustomerController.addNote);

// Passport Document endpoints
router.post('/:id/passport-document', uploadRateLimiter, passportDocUpload.single('passportDocument'), CustomerController.uploadPassportDocument);
router.get('/:id/passport-document', CustomerController.getPassportDocument);
router.delete('/:id/passport-document', requireRole('ADMIN'), CustomerController.deletePassportDocument);

export default router;

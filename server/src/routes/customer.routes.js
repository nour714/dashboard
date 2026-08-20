/**
 * AfricaTravel - Customer CRM Routes
 */

import { Router } from 'express';
import { CustomerController } from '../controllers/customer.controller.js';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import {
  createCustomerSchema,
  updateCustomerSchema,
  addCustomerNoteSchema
} from '../schemas/customer.schema.js';

const router = Router();

router.use(authenticate);

router.get('/', CustomerController.getCustomers);
router.get('/:id', CustomerController.getCustomerById);
router.post('/', validate({ body: createCustomerSchema }), CustomerController.createCustomer);
router.patch('/:id', validate({ body: updateCustomerSchema }), CustomerController.updateCustomer);
router.post('/:id/notes', validate({ body: addCustomerNoteSchema }), CustomerController.addNote);

export default router;

/**
 * AfricaTravel - Employee Management Routes (ADMIN only)
 */

import { Router } from 'express';
import { EmployeeController } from '../controllers/employee.controller.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import {
  createEmployeeSchema,
  updateEmployeeSchema,
  deleteEmployeeSchema
} from '../schemas/employee.schema.js';

const router = Router();

// Strictly ADMIN-only endpoints
router.use(authenticate, requireRole('ADMIN'));

router.get('/', EmployeeController.getEmployees);
router.get('/:id', EmployeeController.getEmployeeById);
router.post('/', validate({ body: createEmployeeSchema }), EmployeeController.createEmployee);
router.patch('/:id', validate({ body: updateEmployeeSchema }), EmployeeController.updateEmployee);
router.delete('/:id', validate({ body: deleteEmployeeSchema }), EmployeeController.deleteEmployee);

export default router;

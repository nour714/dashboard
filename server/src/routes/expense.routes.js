/**
 * AfricaTravel — Office Expenses Routes
 */

import { Router } from 'express';
import { ExpenseController } from '../controllers/expense.controller.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import {
  createExpenseSchema,
  queryExpensesSchema
} from '../schemas/expense.schema.js';

const router = Router();

// All expense endpoints require authentication
router.use(authenticate);

router.get('/', requireRole('ADMIN', 'AGENT'), validate({ query: queryExpensesSchema }), ExpenseController.getExpenses);
router.post('/', requireRole('ADMIN', 'AGENT'), validate({ body: createExpenseSchema }), ExpenseController.createExpense);
router.delete('/:id', requireRole('ADMIN'), ExpenseController.deleteExpense);

export default router;

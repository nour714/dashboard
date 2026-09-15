/**
 * AfricaTravel - Settings Routes
 */

import { Router } from 'express';
import { SettingController } from '../controllers/setting.controller.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { updateSettingsSchema } from '../schemas/setting.schema.js';

const router = Router();

// All settings routes require authentication
router.use(authenticate);

router.get('/', requireRole('ADMIN', 'AGENT'), SettingController.getSettings);
router.patch('/', requireRole('ADMIN'), validate({ body: updateSettingsSchema }), SettingController.updateSettings);
router.put('/', requireRole('ADMIN'), validate({ body: updateSettingsSchema }), SettingController.updateSettings);

export default router;

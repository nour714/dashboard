/**
 * AfricaTravel - Authentication Routes
 */

import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller.js';
import { validate } from '../middleware/validate.js';
import { authenticate } from '../middleware/auth.js';
import { authRateLimiter } from '../middleware/rate-limiter.js';
import { loginSchema, refreshTokenSchema, updateProfileSchema, changePasswordSchema } from '../schemas/auth.schema.js';

const router = Router();

router.post('/login', authRateLimiter, validate({ body: loginSchema }), AuthController.login);
router.post('/refresh', validate({ body: refreshTokenSchema }), AuthController.refresh);
router.post('/logout', authenticate, AuthController.logout);
router.get('/me', authenticate, AuthController.me);
router.patch('/profile', authenticate, validate({ body: updateProfileSchema }), AuthController.updateProfile);
router.post('/change-password', authenticate, validate({ body: changePasswordSchema }), AuthController.changePassword);

export default router;

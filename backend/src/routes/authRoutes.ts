import express from 'express';
import { signup, login, refresh, logout } from '../controllers/authController';
import { validate, signupSchema, loginSchema, refreshTokenSchema } from '../middleware/validation';
import { loginLimiter, signupLimiter } from '../middleware/rateLimiter';

const router = express.Router();

router.post('/signup', signupLimiter, validate(signupSchema), signup);
router.post('/login', loginLimiter, validate(loginSchema), login);
router.post('/refresh', validate(refreshTokenSchema), refresh);
router.post('/logout', logout);

export default router;

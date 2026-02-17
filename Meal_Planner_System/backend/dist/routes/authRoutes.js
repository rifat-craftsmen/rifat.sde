import { Router } from 'express';
import { login, logout, getCurrentUser } from '../controllers/authController';
import { authenticate } from '../middleware/auth';
import { loginValidation } from '../middleware/validation';
import rateLimit from 'express-rate-limit';
const router = Router();
const loginLimiter = rateLimit({
    windowMs: 10 * 60 * 1000, // 10 minutes
    max: 5, // 5 attempts
    message: 'Too many login attempts, please try again later',
});
router.post('/login', loginLimiter, loginValidation, login);
router.post('/logout', logout);
router.get('/me', authenticate, getCurrentUser);
export default router;

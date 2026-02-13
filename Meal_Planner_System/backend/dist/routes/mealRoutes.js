import { Router } from 'express';
import { getMyMealSchedule, addOrUpdateMyMeals, getMyMealStats } from '../controllers/mealController';
import { authenticate } from '../middleware/auth';
import { mealUpdateValidation } from '../middleware/validation';
const router = Router();
router.get('/my-schedule', authenticate, getMyMealSchedule);
router.patch('/my-record', authenticate, mealUpdateValidation, addOrUpdateMyMeals);
router.get('/my-stats', authenticate, getMyMealStats);
export default router;

import { Router } from 'express';
import {
  getEmployees,
  getTeams,
  getMyTeamMembers,
  getEmployeeSchedule,
  updateEmployeeMeals,
  createSchedule,
  getSchedule,
  deleteSchedule,
  getHeadcount,
  getDailyParticipationData,
  bulkUpdateMealsController,
} from '../controllers/adminController';
import {
  createUserController,
  getUserController,
  updateUserController,
  deleteUserController,
} from '../controllers/userController';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/authorize';
import { requireTeamAccess } from '../middleware/teamAccess';
import { mealUpdateValidation, scheduleValidation, userCreationValidation, userUpdateValidation, bulkMealUpdateValidation } from '../middleware/validation';

const router = Router();

// User management (Admin only)
router.post('/users', authenticate, requireRole('ADMIN'), userCreationValidation, createUserController);
router.get('/users/:userId', authenticate, requireRole('ADMIN'), getUserController);
router.patch('/users/:userId', authenticate, requireRole('ADMIN'), userUpdateValidation, updateUserController);
router.delete('/users/:userId', authenticate, requireRole('ADMIN'), deleteUserController);

// Employee management
router.get('/employees', authenticate, requireRole('ADMIN'), getEmployees);
router.get('/teams', authenticate, requireRole('ADMIN'), getTeams);
router.get('/team/members', authenticate, requireRole('LEAD', 'ADMIN'), getMyTeamMembers);

// Proxy meal editing
router.get(
  '/employee/:userId/schedule',
  authenticate,
  requireRole('LEAD', 'ADMIN'),
  requireTeamAccess,
  getEmployeeSchedule
);
router.patch(
  '/employee/:userId/record',
  authenticate,
  requireRole('LEAD', 'ADMIN'),
  requireTeamAccess,
  mealUpdateValidation,
  updateEmployeeMeals
);

// Schedule management
router.post('/meal-schedule', authenticate, requireRole('ADMIN'), scheduleValidation, createSchedule);
router.get('/meal-schedule', authenticate, requireRole('ADMIN'), getSchedule);
router.delete('/meal-schedule/:id', authenticate, requireRole('ADMIN'), deleteSchedule);

// Headcount
router.get('/headcount', authenticate, requireRole('ADMIN', 'LOGISTICS'), getHeadcount);

// Daily participation
router.get('/daily-participation', authenticate, requireRole('LEAD', 'ADMIN'), getDailyParticipationData);

// Bulk meal operations
router.post('/meals/bulk-update', authenticate, requireRole('LEAD', 'ADMIN'), bulkMealUpdateValidation, bulkUpdateMealsController);

export default router;
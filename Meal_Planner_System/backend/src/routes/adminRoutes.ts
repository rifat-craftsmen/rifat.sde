import { Router } from 'express';
import {
  getEmployees,
  getMyTeamMembers,
  getEmployeeSchedule,
  updateEmployeeMeals,
  createSchedule,
  getSchedule,
  deleteSchedule,
  getHeadcount,
} from '../controllers/adminController';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/authorize';
import { requireTeamAccess } from '../middleware/teamAccess';
import { mealUpdateValidation, scheduleValidation } from '../middleware/validation';

const router = Router();

// Employee management
router.get('/employees', authenticate, requireRole('ADMIN'), getEmployees);
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

export default router;
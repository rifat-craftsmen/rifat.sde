import { body, validationResult } from 'express-validator';
import { Request, Response, NextFunction } from 'express';

export const validateRequest = (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

export const loginValidation = [
  body('email').isEmail().withMessage('Valid email required'),
  body('password').notEmpty().withMessage('Password required'),
  validateRequest,
];

export const mealUpdateValidation = [
  body('date').matches(/^\d{4}-\d{2}-\d{2}$/).withMessage('Valid date in YYYY-MM-DD format required'),
  body('lunch').isBoolean(),
  body('snacks').isBoolean(),
  body('iftar').isBoolean(),
  body('eventDinner').isBoolean(),
  body('optionalDinner').isBoolean(),
  validateRequest,
];

export const scheduleValidation = [
  body('date').isISO8601().toDate().withMessage('Valid date required'),
  body('lunchEnabled').isBoolean(),
  body('snacksEnabled').isBoolean(),
  body('iftarEnabled').isBoolean(),
  body('eventDinnerEnabled').isBoolean(),
  body('optionalDinnerEnabled').isBoolean(),
  body('occasionName').optional().isString(),
  body('isHoliday').isBoolean(),
  body('isOfficeClosed').isBoolean(),
  validateRequest,
];

export const userCreationValidation = [
  body('name').notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Valid email required'),
  body('role').isIn(['EMPLOYEE', 'LEAD', 'ADMIN', 'LOGISTICS']).withMessage('Valid role required'),
  body('teamId').optional().isInt().withMessage('Team ID must be a number'),
  body('password').optional().isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  validateRequest,
];

export const userUpdateValidation = [
  body('name').optional().notEmpty().withMessage('Name cannot be empty'),
  body('email').optional().isEmail().withMessage('Valid email required'),
  body('role').optional().isIn(['EMPLOYEE', 'LEAD', 'ADMIN', 'LOGISTICS']).withMessage('Valid role required'),
  body('teamId').optional(),
  body('status').optional().isIn(['ACTIVE', 'INACTIVE']).withMessage('Valid status required'),
  validateRequest,
];

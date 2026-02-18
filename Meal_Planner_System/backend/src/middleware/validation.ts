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
  body('lunch').optional({ nullable: true }).isBoolean(),
  body('snacks').optional({ nullable: true }).isBoolean(),
  body('iftar').optional({ nullable: true }).isBoolean(),
  body('eventDinner').optional({ nullable: true }).isBoolean(),
  body('optionalDinner').optional({ nullable: true }).isBoolean(),
  body('workFromHome').optional().isBoolean(),
  validateRequest,
];

export const scheduleValidation = [
  body('date').matches(/^\d{4}-\d{2}-\d{2}$/).withMessage('Valid date in YYYY-MM-DD format required'),
  body('lunchEnabled').isBoolean(),
  body('snacksEnabled').isBoolean(),
  body('iftarEnabled').isBoolean(),
  body('eventDinnerEnabled').isBoolean(),
  body('optionalDinnerEnabled').isBoolean(),
  body('occasionName').optional().isString(),
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

export const bulkMealUpdateValidation = [
  body('userIds').isArray().withMessage('userIds must be an array'),
  body('userIds.*').isInt().withMessage('Each userId must be an integer'),
  body('date').matches(/^\d{4}-\d{2}-\d{2}$/).withMessage('Valid date in YYYY-MM-DD format required'),
  body('action')
    .isIn(['WFH_ALL', 'ALL_OFF', 'SET_ALL_MEALS', 'UNSET_ALL_MEALS'])
    .withMessage('Invalid action'),
  validateRequest,
];

export const globalWFHValidation = [
  body('dateFrom').matches(/^\d{4}-\d{2}-\d{2}$/).withMessage('Valid dateFrom in YYYY-MM-DD format required'),
  body('dateTo').matches(/^\d{4}-\d{2}-\d{2}$/).withMessage('Valid dateTo in YYYY-MM-DD format required'),
  body('note').optional().isString(),
  validateRequest,
];

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
  body('date').isISO8601().toDate().withMessage('Valid date required'),
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
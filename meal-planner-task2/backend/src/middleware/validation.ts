import { body, validationResult } from 'express-validator'
import { Request, Response, NextFunction } from 'express'

export const validateRequest = (req: Request, res: Response, next: NextFunction): void => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    res.status(400).json({ errors: errors.array() })
    return
  }
  next()
}

export const mealUpdateValidation = [
  body('date').matches(/^\d{4}-\d{2}-\d{2}$/).withMessage('Valid date in YYYY-MM-DD format required'),
  body('lunch').optional({ nullable: true }).isBoolean(),
  body('snacks').optional({ nullable: true }).isBoolean(),
  body('iftar').optional({ nullable: true }).isBoolean(),
  body('eventDinner').optional({ nullable: true }).isBoolean(),
  body('optionalDinner').optional({ nullable: true }).isBoolean(),
  body('workFromHome').optional().isBoolean(),
  validateRequest,
]

export const scheduleValidation = [
  body('date')
    .matches(/^\d{4}-\d{2}-\d{2}$/).withMessage('Valid date in YYYY-MM-DD format required')
    .custom((value: string) => {
      const inputDate = new Date(value + 'T00:00:00')
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      tomorrow.setHours(0, 0, 0, 0)
      if (inputDate < tomorrow) throw new Error('Schedule date must be at least tomorrow')
      return true
    }),
  body('lunchEnabled').isBoolean(),
  body('snacksEnabled').isBoolean(),
  body('iftarEnabled').isBoolean(),
  body('eventDinnerEnabled').isBoolean(),
  body('optionalDinnerEnabled').isBoolean(),
  body('occasionName').optional().isString(),
  validateRequest,
]

export const bulkMealUpdateValidation = [
  body('userIds').isArray({ min: 1 }).withMessage('userIds must be a non-empty array'),
  body('userIds.*').isString().withMessage('Each userId must be a string'),
  body('date').matches(/^\d{4}-\d{2}-\d{2}$/).withMessage('Valid date in YYYY-MM-DD format required'),
  body('action')
    .isIn(['WFH_ALL', 'ALL_OFF', 'SET_ALL_MEALS', 'UNSET_ALL_MEALS'])
    .withMessage('Invalid action'),
  validateRequest,
]

export const globalWFHValidation = [
  body('dateFrom').matches(/^\d{4}-\d{2}-\d{2}$/).withMessage('Valid dateFrom in YYYY-MM-DD format required'),
  body('dateTo').matches(/^\d{4}-\d{2}-\d{2}$/).withMessage('Valid dateTo in YYYY-MM-DD format required'),
  body('dateTo').custom((dateTo: string, { req }) => {
    if (dateTo < (req.body as { dateFrom: string }).dateFrom) {
      throw new Error('dateTo must be on or after dateFrom')
    }
    return true
  }),
  body('note').optional().isString(),
  validateRequest,
]

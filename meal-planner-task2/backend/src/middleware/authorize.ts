import { Response, NextFunction } from 'express'
import { AuthRequest, Role } from '../types/index.js'

export const requireRole = (...allowedRoles: Role[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' })
      return
    }

    if (!allowedRoles.includes(req.user.discordRole)) {
      res.status(403).json({ error: 'Insufficient permissions' })
      return
    }

    next()
  }
}

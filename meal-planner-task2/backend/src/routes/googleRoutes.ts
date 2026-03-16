import { Router } from 'express'
import { googleAuth } from '../middleware/googleAuth.js'
import { handleGoogleInteraction } from '../controllers/googleController.js'

export const googleRouter = Router()

/**
 * POST /google/interactions
 *
 * Signature verification is handled by the Google Chat Lambda Authorizer
 * before this route is reached. googleAuth resolves the user profile via
 * the status-email-index GSI and populates req.user.
 */
googleRouter.post(
  '/interactions',
  googleAuth as Router,
  handleGoogleInteraction as Router,
)

import express, { Router } from 'express'
import { discordVerify } from '../middleware/discordVerify.js'
import { discordAuth } from '../middleware/discordAuth.js'
import { handleInteraction } from '../controllers/discordController.js'

export const discordRouter = Router()

/**
 * POST /discord/interactions
 *
 * express.raw() must come first so req.body is a Buffer for Ed25519 verification.
 * This route is mounted in app.ts BEFORE express.json() to avoid body conflicts.
 */
discordRouter.post(
  '/interactions',
  express.raw({ type: 'application/json' }),
  discordVerify,
  discordAuth as express.RequestHandler,
  handleInteraction as express.RequestHandler,
)

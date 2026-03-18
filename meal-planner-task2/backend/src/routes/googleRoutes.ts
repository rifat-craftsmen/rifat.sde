import express, { Router, RequestHandler } from 'express'
import { googleAuth } from '../middleware/googleAuth.js'
import { handleGoogleInteraction } from '../controllers/googleController.js'

export const googleRouter = Router()

googleRouter.post(
  '/interactions',
  express.json(),
  googleAuth as RequestHandler,
  // Convert Discord response format → Google Chat text format transparently
  ((req, res, next) => {
    const originalJson = res.json.bind(res)
    res.json = (body: any) => {
      if (body?.type === 4 && body?.data?.content) {
        return originalJson({ text: body.data.content })
      }
      return originalJson(body)
    }
    next()
  }) as RequestHandler,
  handleGoogleInteraction as RequestHandler,
)

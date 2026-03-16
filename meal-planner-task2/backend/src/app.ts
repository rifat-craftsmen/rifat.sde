import express, { Request, Response, NextFunction } from 'express'
import cors from 'cors'
import { discordRouter } from './routes/discordRoutes.js'
import { googleRouter }  from './routes/googleRoutes.js'

export const app = express()

app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
}))

// Discord interactions route must be mounted before express.json() because
// Ed25519 signature verification requires the raw request body (Buffer).
app.use('/discord', discordRouter)
app.use('/google',  googleRouter)

app.use(express.json())

// ── Health check ──────────────────────────────────────────────────────────────
app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() })
})

// ── Error handler ─────────────────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err)
  res.status(500).json({ error: 'Internal server error' })
})

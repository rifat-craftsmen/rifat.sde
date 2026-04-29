import { Request, Response, NextFunction } from 'express'
import { verifyKey } from 'discord-interactions'

/**
 * Middleware for the POST /discord/interactions route.
 *
 * Must be mounted with express.raw({ type: 'application/json' }) so that
 * req.body is a Buffer — Ed25519 verification requires the raw bytes.
 *
 * After verification:
 *   - PING (type 1) is answered immediately with { type: 1 }
 *   - All other interactions have req.body replaced with the parsed JSON
 *     object so downstream middleware can read it normally.
 */
export const discordVerify = (req: Request, res: Response, next: NextFunction): void => {
  const signature = req.headers['x-signature-ed25519'] as string
  const timestamp  = req.headers['x-signature-timestamp'] as string
  const publicKey  = process.env.DISCORD_PUBLIC_KEY

  if (!publicKey) {
    console.error('DISCORD_PUBLIC_KEY is not set')
    res.status(500).json({ error: 'Server misconfiguration' })
    return
  }

  const body    = req.body as Buffer
  const rawBody = body.toString('utf8')

  const isValid = verifyKey(body, signature, timestamp, publicKey)
  if (!isValid) {
    console.error('[discordVerify] Signature invalid')
    res.status(401).json({ error: 'Invalid request signature' })
    return
  }

  const interaction = JSON.parse(rawBody)

  if (interaction.type === 1) {
    res.json({ type: 1 })
    return
  }

  req.body = interaction
  next()
}

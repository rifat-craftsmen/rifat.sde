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
  const signature = req.headers['x-signature-ed25519'] as string | undefined
  const timestamp  = req.headers['x-signature-timestamp'] as string | undefined
  const publicKey  = process.env.DISCORD_PUBLIC_KEY

  if (!signature || !timestamp) {
    res.status(401).json({ error: 'Missing signature headers' })
    return
  }

  if (!publicKey) {
    console.error('DISCORD_PUBLIC_KEY is not set')
    res.status(500).json({ error: 'Server misconfiguration' })
    return
  }

  // verifyKey expects the raw body as a string, not Buffer
  const rawBody = (req.body as Buffer).toString('utf8')
  const isValid = verifyKey(rawBody, signature, timestamp, publicKey)
  if (!isValid) {
    res.status(401).json({ error: 'Invalid request signature' })
    return
  }

  // Parse body now that signature is confirmed
  const interaction = JSON.parse((req.body as Buffer).toString())

  // PING — respond immediately, no further processing needed
  if (interaction.type === 1) {
    res.json({ type: 1 })
    return
  }

  // Replace raw Buffer with parsed object for downstream handlers
  req.body = interaction
  next()
}

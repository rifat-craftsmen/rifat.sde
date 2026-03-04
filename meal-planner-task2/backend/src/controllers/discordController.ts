import { Response } from 'express'
import { AuthRequest } from '../types/index.js'

/**
 * Entry point for all Discord slash commands.
 * Runs after discordVerify (signature checked, PING handled)
 * and discordAuth (req.user populated).
 *
 * Future features will add command-specific handlers imported here.
 */
export const handleInteraction = (req: AuthRequest, res: Response): void => {
  const { type, data } = req.body as { type: number; data?: { name?: string } }

  // APPLICATION_COMMAND (type 2)
  if (type === 2) {
    const commandName = data?.name ?? 'unknown'
    // TODO: dispatch to feature-specific command handlers (F2+)
    res.json({
      type: 4, // CHANNEL_MESSAGE_WITH_SOURCE
      data: {
        content: `Command \`/${commandName}\` is not yet implemented.`,
        flags: 64, // EPHEMERAL
      },
    })
    return
  }

  // MESSAGE_COMPONENT or MODAL_SUBMIT — handled in future features
  res.json({ type: 1 })
}

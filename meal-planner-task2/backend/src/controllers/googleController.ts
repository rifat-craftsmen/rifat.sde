import { Response } from 'express'
import { AuthRequest } from '../types/index.js'
import { handleMySchedule }     from '../commands/mySchedule.js'
import { handleCreateSchedule } from '../commands/createSchedule.js'
import { handleListSchedules }  from '../commands/listSchedules.js'
import { handleDeleteSchedule } from '../commands/deleteSchedule.js'

/**
 * Entry point for all Google Chat slash commands.
 * Runs after the Google Chat Authorizer Lambda (JWT verified)
 * and googleAuth middleware (req.user populated).
 *
 * Google Chat sends slash commands as:
 *   { type: 'MESSAGE', message: { slashCommand: { commandName: '/my-schedule' } } }
 *
 * Command handlers are shared with Discord — req.user has the same shape.
 * Responses must be Google Chat Card JSON or { text: '...' }.
 */
export const handleGoogleInteraction = async (req: AuthRequest, res: Response): Promise<void> => {
  const event       = req.body as { type?: string; message?: { slashCommand?: { commandName?: string } } }
  const commandName = event?.message?.slashCommand?.commandName?.replace(/^\//, '')

  if (!commandName) {
    res.json({ text: 'Unknown command.' })
    return
  }

  try {
    switch (commandName) {
      case 'my-schedule':     await handleMySchedule(req, res);     return
      case 'create-schedule': await handleCreateSchedule(req, res); return
      case 'list-schedules':  await handleListSchedules(req, res);  return
      case 'delete-schedule': await handleDeleteSchedule(req, res); return
      default:
        res.json({ text: `Unknown command \`/${commandName}\`.` })
    }
  } catch (err) {
    console.error('Google Chat command handler error:', err)
    res.json({ text: 'An internal error occurred. Please try again.' })
  }
}

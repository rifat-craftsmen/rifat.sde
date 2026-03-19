import { Response } from 'express'
import { AuthRequest } from '../types/index.js'
import { handleMySchedule }     from '../commands/mySchedule.js'
import { handleCreateSchedule } from '../commands/createSchedule.js'
import { handleListSchedules }  from '../commands/listSchedules.js'
import { handleDeleteSchedule } from '../commands/deleteSchedule.js'
import { handleUpdateSchedule } from '../commands/updateSchedule.js'
import { handleCreateMeal }     from '../commands/createMeal.js'
import { handleUpdateMeal }     from '../commands/updateMeal.js'
import { handleSetWfhPeriod }   from '../commands/setWfhPeriod.js'
import { handleListWfhPeriods } from '../commands/listWfhPeriods.js'
import { handleUpdateWfhPeriod } from '../commands/updateWfhPeriod.js'
import { handleDeleteWfhPeriod } from '../commands/deleteWfhPeriod.js'
import { handleHeadcount }       from '../commands/headcount.js'

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
  const event       = req.body as any
  const commandName = (event?.message?.annotations?.[0]?.slashCommand?.commandName as string | undefined)?.replace(/^\//, '')

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
      case 'update-schedule': await handleUpdateSchedule(req, res); return
      case 'create-meal':       await handleCreateMeal(req, res);       return
      case 'update-meal':       await handleUpdateMeal(req, res);       return
      case 'set-wfh-period':    await handleSetWfhPeriod(req, res);    return
      case 'list-wfh-periods':  await handleListWfhPeriods(req, res);  return
      case 'update-wfh-period': await handleUpdateWfhPeriod(req, res); return
      case 'delete-wfh-period': await handleDeleteWfhPeriod(req, res); return
      case 'headcount':         await handleHeadcount(req, res);       return
      default:
        res.json({ text: `Unknown command \`/${commandName}\`.` })
    }
  } catch (err) {
    console.error('Google Chat command handler error:', err)
    res.json({ text: 'An internal error occurred. Please try again.' })
  }
}

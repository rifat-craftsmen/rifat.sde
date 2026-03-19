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

/**
 * Entry point for all Discord slash commands.
 * Runs after discordVerify (signature checked, PING handled)
 * and discordAuth (req.user populated).
 */
export const handleInteraction = async (req: AuthRequest, res: Response): Promise<void> => {
  const { type, data } = req.body as { type: number; data?: { name?: string } }

  // APPLICATION_COMMAND (type 2)
  if (type === 2) {
    try {
      switch (data?.name) {
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
        default:
          res.json({ type: 4, data: { content: `Unknown command \`/${data?.name}\`.`, flags: 64 } })
          return
      }
    } catch (err) {
      console.error('Command handler error:', err)
      res.json({ type: 4, data: { content: 'An internal error occurred. Please try again.', flags: 64 } })
    }
    return
  }

  // MESSAGE_COMPONENT or MODAL_SUBMIT — handled in future features
  res.json({ type: 1 })
}

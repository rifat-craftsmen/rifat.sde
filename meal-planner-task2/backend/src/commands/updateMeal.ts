import { Response } from 'express'
import { AuthRequest } from '../types/index.js'
import { createOrUpdateMealRecord } from '../services/mealService.js'
import { parseMealOptions, validateMealDate } from './_mealChoiceHelpers.js'

export async function handleUpdateMeal(req: AuthRequest, res: Response): Promise<void> {
  const data = parseMealOptions(req)

  const err = validateMealDate(data.date)
  if (err) {
    res.json({ type: 4, data: { content: err, flags: 64 } })
    return
  }

  try {
    await createOrUpdateMealRecord(data.date, data, req.user!.discordId)
  } catch (e: unknown) {
    if (e instanceof Error && e.message === 'User profile not found') {
      res.json({ type: 4, data: { content: 'Your profile was not found. Please contact an admin.', flags: 64 } })
      return
    }
    throw e
  }

  const wfhNote = data.workFromHome ? ' — 🏠 WFH noted.' : '.'
  res.json({ type: 4, data: { content: `Meal choices updated for **${data.date}**${wfhNote}`, flags: 64 } })
}

import { Response } from 'express'
import { AuthRequest } from '../types/index.js'
import { getMySchedule } from '../services/mealService.js'
import type { ScheduleDay, MealScheduleItem } from '../types/index.js'

// Meal columns in display order
const MEALS: Array<{ key: keyof MealScheduleItem; label: string }> = [
  { key: 'lunchEnabled',          label: 'L' },
  { key: 'snacksEnabled',         label: 'S' },
  { key: 'iftarEnabled',          label: 'I' },
  { key: 'eventDinnerEnabled',    label: 'ED' },
  { key: 'optionalDinnerEnabled', label: 'OD' },
]

const MEAL_RECORD_KEYS = ['lunch', 'snacks', 'iftar', 'eventDinner', 'optionalDinner'] as const

function formatDay(day: ScheduleDay): string {
  const date    = new Date(day.date + 'T00:00:00Z')
  const weekday = date.toLocaleDateString('en-GB', { weekday: 'short', timeZone: 'UTC' })
  const dayMonth = date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', timeZone: 'UTC' })
  const label   = `${weekday}, ${dayMonth}`
  const prefix  = day.isToday ? '**Today** ' : ''

  const mealCols = MEALS.map((m, i) => {
    const enabled = day.schedule?.[m.key] as boolean | undefined
    if (!enabled) return '➖'                        // meal not offered
    const chosen = day.record?.[MEAL_RECORD_KEYS[i]] // true | false | null | undefined
    if (chosen === true)  return `${m.label} ✅`
    if (chosen === false) return `${m.label} ❌`
    return `${m.label} ◽`                            // not set yet
  }).join('  ')

  const wfh = (day.record?.workFromHome || day.globalWFH) ? '  🏠' : ''
  return `${prefix}${label} =>  ${mealCols}${wfh}`
}

export async function handleMySchedule(req: AuthRequest, res: Response): Promise<void> {
  const days = await getMySchedule(req.user!.discordId)

  const lines = days.map(formatDay)
  const legend = '*✅ opted in   ❌ opted out   ◽ not set   ➖ not offered   🏠 WFH*'

  res.json({
    type: 4,
    data: {
      content: `**Meal Schedule**\n\n${lines.join('\n')}\n\n${legend}`,
      flags: 64,
    },
  })
}

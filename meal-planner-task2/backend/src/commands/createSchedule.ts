import { Response } from 'express'
import { AuthRequest } from '../types/index.js'
import { createMealSchedule } from '../services/adminService.js'

interface DiscordOption {
  name: string
  value: string | boolean | number
}

function opt<T>(options: DiscordOption[], name: string): T {
  return options.find(o => o.name === name)?.value as T
}

export async function handleCreateSchedule(req: AuthRequest, res: Response): Promise<void> {
  if (req.user!.role !== 'ADMIN') {
    res.json({ type: 4, data: { content: 'Only admins can create schedules.', flags: 64 } })
    return
  }

  const options: DiscordOption[] = req.body.data?.options ?? []

  const date                 = opt<string>(options, 'date')
  const lunchEnabled         = opt<boolean>(options, 'lunch_enabled')
  const snacksEnabled        = opt<boolean>(options, 'snacks_enabled')
  const iftarEnabled         = opt<boolean>(options, 'iftar_enabled')
  const eventDinnerEnabled   = opt<boolean>(options, 'event_dinner_enabled')
  const optionalDinnerEnabled = opt<boolean>(options, 'optional_dinner_enabled')
  const occasionName         = opt<string | undefined>(options, 'occasion_name')

  // Validate date is at least tomorrow
  const inputDate = new Date(date + 'T00:00:00')
  const tomorrow  = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  tomorrow.setHours(0, 0, 0, 0)
  if (inputDate < tomorrow) {
    res.json({ type: 4, data: { content: 'Schedule date must be at least tomorrow.', flags: 64 } })
    return
  }

  await createMealSchedule(
    { date, lunchEnabled, snacksEnabled, iftarEnabled, eventDinnerEnabled, optionalDinnerEnabled, occasionName },
    req.user!.userId,
  )

  const meals = [
    lunchEnabled         && 'Lunch',
    snacksEnabled        && 'Snacks',
    iftarEnabled         && 'Iftar',
    eventDinnerEnabled   && 'Event Dinner',
    optionalDinnerEnabled && 'Optional Dinner',
  ].filter(Boolean).join(', ') || 'None'

  const extra = occasionName ? ` — *${occasionName}*` : ''
  res.json({
    type: 4,
    data: {
      content: `Schedule created for **${date}**${extra}\nMeals enabled: ${meals}`,
      flags: 64,
    },
  })
}

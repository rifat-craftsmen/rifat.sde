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

  let date: string
  let lunchEnabled: boolean
  let snacksEnabled: boolean
  let iftarEnabled: boolean
  let eventDinnerEnabled: boolean
  let optionalDinnerEnabled: boolean
  let occasionName: string | undefined

  if (req.user!.platform === 'google') {
    const argText = (req.body?.message?.argumentText as string ?? '').trim()
    const occasionMatch = argText.match(/occasion:(.+)/)
    occasionName = occasionMatch ? occasionMatch[1].trim() : undefined
    const argsWithoutOccasion = argText.replace(/occasion:.+/, '').trim()
    const parts = argsWithoutOccasion.split(/\s+/)
    date                 = parts[0] ?? ''
    const meals          = parts.slice(1).map(m => m.toLowerCase())
    lunchEnabled         = meals.includes('lunch')
    snacksEnabled        = meals.includes('snacks')
    iftarEnabled         = meals.includes('iftar')
    eventDinnerEnabled   = meals.includes('eventdinner')
    optionalDinnerEnabled = meals.includes('optionaldinner')
  } else {
    const options: DiscordOption[] = req.body.data?.options ?? []
    date                 = opt<string>(options, 'date')
    lunchEnabled         = opt<boolean>(options, 'lunch_enabled')
    snacksEnabled        = opt<boolean>(options, 'snacks_enabled')
    iftarEnabled         = opt<boolean>(options, 'iftar_enabled')
    eventDinnerEnabled   = opt<boolean>(options, 'event_dinner_enabled')
    optionalDinnerEnabled = opt<boolean>(options, 'optional_dinner_enabled')
    occasionName         = opt<string | undefined>(options, 'occasion_name')
  }

  // Validate date is at least tomorrow
  const inputDate = new Date(date + 'T00:00:00Z')
  const tomorrow  = new Date()
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1)
  tomorrow.setUTCHours(0, 0, 0, 0)
  if (inputDate < tomorrow) {
    res.json({ type: 4, data: { content: 'Schedule date must be at least tomorrow.', flags: 64 } })
    return
  }

  // Reject weekends (Sat = 6, Sun = 0)
  const dow = inputDate.getUTCDay()
  if (dow === 0 || dow === 6) {
    res.json({ type: 4, data: { content: 'Schedules cannot be created for weekends (Sat/Sun).', flags: 64 } })
    return
  }

  await createMealSchedule(
    { date, lunchEnabled, snacksEnabled, iftarEnabled, eventDinnerEnabled, optionalDinnerEnabled, occasionName },
    req.user!.discordId,
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
    },
  })
}

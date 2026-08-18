import { Response } from 'express'
import { AuthRequest } from '../types/index.js'
import { updateMealScheduleWithAudit } from '../services/adminService.js'

interface DiscordOption {
  name: string
  value: string | boolean | number
}

function opt<T>(options: DiscordOption[], name: string): T | undefined {
  const found = options.find(o => o.name === name)
  return found !== undefined ? (found.value as T) : undefined
}

export async function handleUpdateSchedule(req: AuthRequest, res: Response): Promise<void> {
  if (req.user!.role !== 'ADMIN') {
    res.json({ type: 4, data: { content: 'Only admins can update schedules.', flags: 64 } })
    return
  }

  let date: string
  let lunchEnabled:          boolean | undefined
  let snacksEnabled:         boolean | undefined
  let iftarEnabled:          boolean | undefined
  let eventDinnerEnabled:    boolean | undefined
  let optionalDinnerEnabled: boolean | undefined
  let occasionName:          string | undefined

  if (req.user!.platform === 'google') {
    const argText = (req.body?.message?.argumentText as string ?? '').trim()
    const occasionMatch = argText.match(/occasion:(.+)/)
    occasionName = occasionMatch ? occasionMatch[1].trim() : undefined
    const argsWithoutOccasion = argText.replace(/occasion:.+/, '').trim()
    const parts = argsWithoutOccasion.split(/\s+/)
    date = parts[0] ?? ''
    const meals = parts.slice(1).map(m => m.toLowerCase())
    if (meals.length > 0) {
      lunchEnabled          = meals.includes('lunch')
      snacksEnabled         = meals.includes('snacks')
      iftarEnabled          = meals.includes('iftar')
      eventDinnerEnabled    = meals.includes('eventdinner')
      optionalDinnerEnabled = meals.includes('optionaldinner')
    }
  } else {
    const options: DiscordOption[] = req.body.data?.options ?? []
    date                  = opt<string>(options, 'date') ?? ''
    lunchEnabled          = opt<boolean>(options, 'lunch_enabled')
    snacksEnabled         = opt<boolean>(options, 'snacks_enabled')
    iftarEnabled          = opt<boolean>(options, 'iftar_enabled')
    eventDinnerEnabled    = opt<boolean>(options, 'event_dinner_enabled')
    optionalDinnerEnabled = opt<boolean>(options, 'optional_dinner_enabled')
    occasionName          = opt<string>(options, 'occasion_name')
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    res.json({ type: 4, data: { content: 'Invalid date format. Use YYYY-MM-DD.', flags: 64 } })
    return
  }

  const inputDate = new Date(date + 'T00:00:00Z')
  const tomorrow  = new Date()
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1)
  tomorrow.setUTCHours(0, 0, 0, 0)
  if (inputDate < tomorrow) {
    res.json({ type: 4, data: { content: 'Cannot update a schedule for today or a past date.', flags: 64 } })
    return
  }

  const dow = inputDate.getUTCDay()
  if (dow === 0 || dow === 6) {
    res.json({ type: 4, data: { content: 'Schedules cannot be updated for weekends (Sat/Sun).', flags: 64 } })
    return
  }

  const hasUpdate = [lunchEnabled, snacksEnabled, iftarEnabled, eventDinnerEnabled, optionalDinnerEnabled, occasionName]
    .some(v => v !== undefined)
  if (!hasUpdate) {
    res.json({ type: 4, data: { content: 'Provide at least one field to update.', flags: 64 } })
    return
  }

  try {
    await updateMealScheduleWithAudit(
      date,
      { lunchEnabled, snacksEnabled, iftarEnabled, eventDinnerEnabled, optionalDinnerEnabled, occasionName },
      req.user!.discordId,
    )
  } catch (err: unknown) {
    if (err instanceof Error && err.message.startsWith('No schedule found')) {
      res.json({ type: 4, data: { content: `No schedule exists for **${date}**. Create one first with \`/create-schedule\`.`, flags: 64 } })
      return
    }
    throw err
  }

  res.json({ type: 4, data: { content: `Schedule for **${date}** updated.`, flags: 64 } })
}

import { AuthRequest, MealUpdateData } from '../types/index.js'
import { getTodayString, isWeekend, isDateInValidWindow } from '../utils/dateHelpers.js'

interface DiscordOption {
  name:  string
  value: string | boolean | number
}

function opt<T>(options: DiscordOption[], name: string): T | undefined {
  const found = options.find(o => o.name === name)
  return found !== undefined ? (found.value as T) : undefined
}

export function parseMealOptions(req: AuthRequest): MealUpdateData {
  if (req.user!.platform === 'google') {
    const argText = (req.body?.message?.argumentText as string ?? '').trim()
    const parts   = argText.split(/\s+/)
    const date    = parts[0] ?? ''
    const tokens  = parts.slice(1).map(t => t.toLowerCase())
    return {
      date,
      lunch:          tokens.includes('lunch')          ? true : undefined,
      snacks:         tokens.includes('snacks')         ? true : undefined,
      iftar:          tokens.includes('iftar')          ? true : undefined,
      eventDinner:    tokens.includes('eventdinner')    ? true : undefined,
      optionalDinner: tokens.includes('optionaldinner') ? true : undefined,
      workFromHome:   tokens.includes('wfh')            ? true : undefined,
    }
  }

  const options: DiscordOption[] = req.body.data?.options ?? []
  return {
    date:           opt<string>(options, 'date') ?? '',
    lunch:          opt<boolean>(options, 'lunch'),
    snacks:         opt<boolean>(options, 'snacks'),
    iftar:          opt<boolean>(options, 'iftar'),
    eventDinner:    opt<boolean>(options, 'event_dinner'),
    optionalDinner: opt<boolean>(options, 'optional_dinner'),
    workFromHome:   opt<boolean>(options, 'work_from_home'),
  }
}

export function validateMealDate(date: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date))  return 'Invalid date format. Use YYYY-MM-DD.'
  if (date <= getTodayString())             return "Cannot set meals for today or a past date. Today's record is locked."
  if (isWeekend(date))                     return 'Cannot set meals for weekends (Sat/Sun).'
  if (!isDateInValidWindow(date))          return 'Date is outside the 7-weekday booking window.'
  return null
}

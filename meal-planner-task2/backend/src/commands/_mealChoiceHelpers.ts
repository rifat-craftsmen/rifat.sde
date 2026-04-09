import { GetCommand } from '@aws-sdk/lib-dynamodb'
import { dynamo, TABLES } from '../config/dynamoClient.js'
import { AuthRequest, MealUpdateData, MealScheduleItem } from '../types/index.js'
import { getTodayString, isWeekend, isDateInValidWindow, MEAL_WINDOW_WEEKDAYS } from '../utils/dateHelpers.js'
import { isDateInAnyWfhPeriod } from '../services/wfhService.js'

const DEFAULT_SCHEDULE = {
  lunchEnabled:          true,
  snacksEnabled:         true,
  iftarEnabled:          false,
  eventDinnerEnabled:    false,
  optionalDinnerEnabled: false,
}

interface DiscordOption {
  name:  string
  value: string | boolean | number
}

function opt<T>(options: DiscordOption[], name: string): T | undefined {
  const found = options.find(o => o.name === name)
  return found !== undefined ? (found.value as T) : undefined
}

/** 3-state token parser for Google Chat text commands.
 *  `token`  → true  (opted in)
 *  `-token` → false (explicit opt-out)
 *  absent   → undefined (carry-forward / not specified)
 */
function parseToken(tokens: string[], name: string): boolean | undefined {
  if (tokens.includes(name))       return true
  if (tokens.includes(`-${name}`)) return false
  return undefined
}

export async function parseMealOptions(req: AuthRequest): Promise<MealUpdateData> {
  if (req.user!.platform === 'google') {
    const argText = (req.body?.message?.argumentText as string ?? '').trim()
    const parts   = argText.split(/\s+/)
    const date    = parts[0] ?? ''
    const tokens  = parts.slice(1).map(t => t.toLowerCase())

    // Fetch schedule to distinguish enabled vs disabled meals
    let schedule: typeof DEFAULT_SCHEDULE = DEFAULT_SCHEDULE
    if (date) {
      const result = await dynamo.send(new GetCommand({
        TableName: TABLES.MAIN,
        Key: { PK: 'SCHEDULE', SK: date },
      }))
      if (result.Item) schedule = result.Item as MealScheduleItem
    }

    return {
      date,
      lunch:          schedule.lunchEnabled          ? parseToken(tokens, 'lunch')          : null,
      snacks:         schedule.snacksEnabled         ? parseToken(tokens, 'snacks')         : null,
      iftar:          schedule.iftarEnabled          ? parseToken(tokens, 'iftar')          : null,
      eventDinner:    schedule.eventDinnerEnabled    ? parseToken(tokens, 'eventdinner')    : null,
      optionalDinner: schedule.optionalDinnerEnabled ? parseToken(tokens, 'optionaldinner') : null,
      workFromHome:   parseToken(tokens, 'wfh'),
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

export async function validateMealDate(date: string): Promise<string | null> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date))  return 'Invalid date format. Use YYYY-MM-DD.'
  if (date <= getTodayString())             return "Cannot set meals for today or a past date. Today's record is locked."
  if (isWeekend(date))                     return 'Cannot set meals for weekends (Sat/Sun).'
  if (!isDateInValidWindow(date))          return `Date is outside the ${MEAL_WINDOW_WEEKDAYS}-weekday booking window.`
  if (await isDateInAnyWfhPeriod(date))    return 'Meal selection is disabled for this date (company-wide WFH period).'
  return null
}

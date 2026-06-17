import { describe, it, expect, beforeEach, vi } from 'vitest'
import { scriptDynamo, resetDynamo } from '../helpers/dynamoMock.js'
import { makeSchedule } from '../helpers/fixtures.js'
import {
  parseMealOptions, validateMealDate,
} from '../../src/commands/_mealChoiceHelpers.js'
import {
  getTodayString, getNextNWeekdays, MEAL_WINDOW_WEEKDAYS,
} from '../../src/utils/dateHelpers.js'

// Mock wfhService.isDateInAnyWfhPeriod so validateMealDate is deterministic.
const isDateInAnyWfhPeriod = vi.fn(async () => false)
vi.mock('../../src/services/wfhService.js', () => ({
  isDateInAnyWfhPeriod: (...a: any[]) => isDateInAnyWfhPeriod(...a),
}))

beforeEach(() => {
  resetDynamo()
  isDateInAnyWfhPeriod.mockReset()
  isDateInAnyWfhPeriod.mockResolvedValue(false)
})

describe('parseMealOptions', () => {
  it('parses Discord named options (event_dinner / work_from_home snake_case)', async () => {
    const req = {
      user: { platform: 'discord' },
      body: {
        data: {
          options: [
            { name: 'date', value: '2026-06-20' },
            { name: 'lunch', value: true },
            { name: 'snacks', value: false },
            { name: 'event_dinner', value: true },
            { name: 'work_from_home', value: true },
          ],
        },
      },
    } as any
    const out = await parseMealOptions(req)
    expect(out).toEqual({
      date: '2026-06-20',
      lunch: true,
      snacks: false,
      iftar: undefined,
      eventDinner: true,
      optionalDinner: undefined,
      workFromHome: true,
    })
  })

  it('Google: token → true, -token → false; disabled meals → null', async () => {
    const schedule = makeSchedule('2026-06-20', { lunchEnabled: true, snacksEnabled: true })
    scriptDynamo({
      get: { [JSON.stringify({ PK: 'SCHEDULE', SK: '2026-06-20' })]: schedule },
    })
    const req = {
      user: { platform: 'google' },
      body: { message: { argumentText: '2026-06-20 lunch -snacks iftar wfh' } },
    } as any
    const out = await parseMealOptions(req)
    expect(out.date).toBe('2026-06-20')
    expect(out.lunch).toBe(true)          // token present
    expect(out.snacks).toBe(false)        // -snacks explicit opt-out
    expect(out.iftar).toBe(null)          // iftar disabled in schedule → null
    expect(out.eventDinner).toBe(null)    // disabled
    expect(out.optionalDinner).toBe(null) // disabled
    expect(out.workFromHome).toBe(true)   // wfh token (not schedule-gated)
  })

  it('Google: with no schedule published, uses DEFAULT_SCHEDULE (lunch+snacks enabled only)', async () => {
    scriptDynamo({}) // no SCHEDULE item
    const req = {
      user: { platform: 'google' },
      body: { message: { argumentText: '2026-06-20 lunch' } },
    } as any
    const out = await parseMealOptions(req)
    expect(out.lunch).toBe(true)
    expect(out.snacks).toBe(undefined)   // enabled by default but absent in args
    expect(out.iftar).toBe(null)         // disabled by default
  })

  it('Google: empty argumentText yields empty date and undefined meal fields', async () => {
    const req = { user: { platform: 'google' }, body: { message: { argumentText: '' } } } as any
    const out = await parseMealOptions(req)
    expect(out.date).toBe('')
    expect(out.lunch).toBe(undefined)
  })
})

describe('validateMealDate', () => {
  const validDate = getNextNWeekdays(MEAL_WINDOW_WEEKDAYS)[1] // 2nd weekday in window

  it('rejects bad format', async () => {
    expect(await validateMealDate('2026/06/20')).toBe('Invalid date format. Use YYYY-MM-DD.')
    expect(await validateMealDate('not-a-date')).toBe('Invalid date format. Use YYYY-MM-DD.')
  })

  it('rejects today or a past date (locked)', async () => {
    expect(await validateMealDate(getTodayString())).toMatch(/locked/)
  })

  it('rejects weekends', async () => {
    // 2026-06-20 is a Saturday
    expect(await validateMealDate('2026-06-20')).toBe('Cannot set meals for weekends (Sat/Sun).')
  })

  it('rejects a date outside the booking window', async () => {
    const last = getNextNWeekdays(MEAL_WINDOW_WEEKDAYS).at(-1)!
    const far = new Date(new Date(last + 'T00:00:00Z').getTime() + 21 * 86400000)
    const dow = far.getUTCDay()
    if (dow === 0) far.setUTCDate(far.getUTCDate() + 1)
    if (dow === 6) far.setUTCDate(far.getUTCDate() + 2)
    const err = await validateMealDate(far.toISOString().slice(0, 10))
    expect(err).toMatch(/outside the .* booking window/)
  })

  it('rejects a date inside a company-wide WFH period', async () => {
    isDateInAnyWfhPeriod.mockResolvedValue(true)
    expect(await validateMealDate(validDate)).toBe('Meal selection is disabled for this date (company-wide WFH period).')
    expect(isDateInAnyWfhPeriod).toHaveBeenCalledWith(validDate)
  })

  it('returns null for a valid future weekday', async () => {
    expect(await validateMealDate(validDate)).toBeNull()
  })
})

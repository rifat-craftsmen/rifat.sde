import { describe, it, expect } from 'vitest'
import {
  toDateString, parseDateString, isWeekend, getNextNWeekdays,
  isDateInValidWindow, getCurrentMonthRange, getCurrentMonthKey,
  getDatesBetween, isDateInPeriod, MEAL_WINDOW_WEEKDAYS,
} from '../../src/utils/dateHelpers.js'

describe('dateHelpers — pure date math', () => {
  describe('parseDateString / toDateString round-trip', () => {
    it('round-trips a YYYY-MM-DD at UTC midnight', () => {
      const d = parseDateString('2026-06-16')
      expect(d.getUTCFullYear()).toBe(2026)
      expect(d.getUTCMonth()).toBe(5) // June (0-indexed)
      expect(d.getUTCDate()).toBe(16)
      expect(toDateString(d)).toBe('2026-06-16')
    })

    it('zero-pads single-digit month/day', () => {
      expect(toDateString(parseDateString('2026-01-05'))).toBe('2026-01-05')
    })
  })

  describe('isWeekend', () => {
    it('flags Saturday and Sunday', () => {
      // 2026-06-20 is a Saturday, 2026-06-21 a Sunday (UTC)
      expect(isWeekend('2026-06-20')).toBe(true)
      expect(isWeekend('2026-06-21')).toBe(true)
    })
    it('passes Monday–Friday', () => {
      // 2026-06-15 Mon … 2026-06-19 Fri
      for (const d of ['2026-06-15','2026-06-16','2026-06-17','2026-06-18','2026-06-19']) {
        expect(isWeekend(d)).toBe(false)
      }
    })
  })

  describe('getNextNWeekdays', () => {
    it('skips weekends and returns N weekday strings', () => {
      // From Mon 2026-06-15, next 7 weekdays = 15,16,17,18,19,22,23 (skips 20/21)
      const from = parseDateString('2026-06-15')
      const days = getNextNWeekdays(7, from)
      expect(days).toHaveLength(7)
      expect(days).toEqual(['2026-06-15','2026-06-16','2026-06-17','2026-06-18','2026-06-19','2026-06-22','2026-06-23'])
      days.forEach(d => expect(isWeekend(d)).toBe(false))
    })

    it('honours a custom N', () => {
      const from = parseDateString('2026-06-19') // Friday
      // next 3 weekdays from Fri: Fri 19, Mon 22, Tue 23
      expect(getNextNWeekdays(3, from)).toEqual(['2026-06-19','2026-06-22','2026-06-23'])
    })
  })

  describe('isDateInValidWindow', () => {
    it('includes today and the last weekday of the window', () => {
      // The window is exactly getNextNWeekdays(MEAL_WINDOW_WEEKDAYS) from today.
      const win = getNextNWeekdays(MEAL_WINDOW_WEEKDAYS)
      expect(isDateInValidWindow(win[0])).toBe(true)
      expect(isDateInValidWindow(win[win.length - 1])).toBe(true)
    })

    it('excludes a date before today and after the window', () => {
      const win = getNextNWeekdays(MEAL_WINDOW_WEEKDAYS)
      const before = parseDateString(win[0]); before.setUTCDate(before.getUTCDate() - 1)
      expect(isDateInValidWindow(toDateString(before))).toBe(false)
      const after = parseDateString(win[win.length - 1]); after.setUTCDate(after.getUTCDate() + 1)
      expect(isDateInValidWindow(toDateString(after))).toBe(false)
    })
  })

  describe('month helpers', () => {
    it('getCurrentMonthKey is YYYY-MM zero-padded', () => {
      const now = new Date()
      const expected = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`
      expect(getCurrentMonthKey()).toBe(expected)
    })

    it('getCurrentMonthRange spans month first..last day', () => {
      const { start, end } = getCurrentMonthRange()
      expect(start).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      expect(getDatesBetween(start, end).length).toBeGreaterThan(27)
      expect(getDatesBetween(start, end).length).toBeLessThanOrEqual(31)
    })
  })

  describe('getDatesBetween', () => {
    it('is inclusive of both ends', () => {
      expect(getDatesBetween('2026-06-10', '2026-06-12')).toEqual(['2026-06-10','2026-06-11','2026-06-12'])
    })
    it('returns single date when start===end', () => {
      expect(getDatesBetween('2026-06-10', '2026-06-10')).toEqual(['2026-06-10'])
    })
  })

  describe('isDateInPeriod', () => {
    it('is inclusive and lexicographic', () => {
      expect(isDateInPeriod('2026-06-15', '2026-06-10', '2026-06-20')).toBe(true)
      expect(isDateInPeriod('2026-06-10', '2026-06-10', '2026-06-20')).toBe(true) // boundary
      expect(isDateInPeriod('2026-06-20', '2026-06-10', '2026-06-20')).toBe(true) // boundary
      expect(isDateInPeriod('2026-06-09', '2026-06-10', '2026-06-20')).toBe(false)
      expect(isDateInPeriod('2026-06-21', '2026-06-10', '2026-06-20')).toBe(false)
    })
  })
})

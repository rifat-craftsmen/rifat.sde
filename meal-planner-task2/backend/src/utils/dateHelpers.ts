import { addDays, format } from 'date-fns'

// ── Core helpers ──────────────────────────────────────────────────────────

// Returns today as a UTC Date at midnight
const getUTCToday = (): Date => {
  const now = new Date()
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
}

// Format a Date to YYYY-MM-DD string (used as DynamoDB keys and SK values)
export const toDateString = (date: Date): string => format(date, 'yyyy-MM-dd')

// Parse a YYYY-MM-DD string back to a UTC midnight Date
export const parseDateString = (dateStr: string): Date => {
  const [year, month, day] = dateStr.split('-').map(Number)
  return new Date(Date.UTC(year, month - 1, day))
}

// ── Date string helpers (used throughout services) ────────────────────────

export const getTodayString = (): string => toDateString(getUTCToday())

export const getTomorrowString = (): string => toDateString(addDays(getUTCToday(), 1))

// Returns true if a YYYY-MM-DD date falls on Saturday (6) or Sunday (0)
export const isWeekend = (dateStr: string): boolean => {
  const d = parseDateString(dateStr)
  const dow = d.getUTCDay()  // 0 = Sun, 6 = Sat
  return dow === 0 || dow === 6
}

// Returns an array of the next N weekday date strings (Mon–Fri) starting from `from`
export const getNextNWeekdays = (n: number, from: Date = getUTCToday()): string[] => {
  const weekdays: string[] = []
  let current = from
  while (weekdays.length < n) {
    const dow = current.getUTCDay()
    if (dow !== 0 && dow !== 6) weekdays.push(toDateString(current))
    current = addDays(current, 1)
  }
  return weekdays
}

// 7-weekday window starting from today (Mon–Fri only)
export const getValidDateRange = (): { start: string; end: string } => {
  const weekdays = getNextNWeekdays(7)
  return { start: weekdays[0], end: weekdays[weekdays.length - 1] }
}

export const isDateInValidWindow = (dateStr: string): boolean => {
  const { start, end } = getValidDateRange()
  return dateStr >= start && dateStr <= end  // lexicographic comparison works for ISO dates
}

// Current calendar month range as YYYY-MM-DD strings
export const getCurrentMonthRange = (): { start: string; end: string } => {
  const now = new Date()
  const y = now.getUTCFullYear()
  const m = now.getUTCMonth()
  const start = new Date(Date.UTC(y, m, 1))
  const end   = new Date(Date.UTC(y, m + 1, 0))  // day 0 of next month = last day of current
  return { start: toDateString(start), end: toDateString(end) }
}

// YYYY-MM string for the wfhMonth counter field on user items
export const getCurrentMonthKey = (): string => {
  const now = new Date()
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`
}

// Generate an array of YYYY-MM-DD strings between start and end (inclusive)
export const getDatesBetween = (start: string, end: string): string[] => {
  const dates: string[] = []
  let current = parseDateString(start)
  const endDate = parseDateString(end)
  while (current <= endDate) {
    dates.push(toDateString(current))
    current = addDays(current, 1)
  }
  return dates
}

// Check if a date string falls within a WFH period [dateFrom, dateTo]
export const isDateInPeriod = (date: string, dateFrom: string, dateTo: string): boolean =>
  date >= dateFrom && date <= dateTo

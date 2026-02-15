import { addDays } from 'date-fns';

// Create a UTC midnight date for the given year/month/day
const utcMidnight = (year: number, month: number, day: number): Date => {
  return new Date(Date.UTC(year, month, day));
};

// Get today as UTC midnight
const getUTCToday = (): Date => {
  const now = new Date();
  return utcMidnight(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
};

export const getTomorrow = (): Date => {
  return addDays(getUTCToday(), 1);
};

export const getValidDateRange = (): { start: Date; end: Date } => {
  const tomorrow = getTomorrow();
  const endDate = addDays(tomorrow, 6); // Tomorrow + 6 days = 7 day window
  return { start: tomorrow, end: endDate };
};

export const isDateInValidWindow = (date: Date): boolean => {
  const { start, end } = getValidDateRange();
  return date >= start && date <= end;
};

export const getCurrentMonthRange = (): { start: Date; end: Date } => {
  const now = new Date();
  const start = utcMidnight(now.getUTCFullYear(), now.getUTCMonth(), 1);
  // Day 0 of next month = last day of current month
  const end = utcMidnight(now.getUTCFullYear(), now.getUTCMonth() + 1, 0);
  return { start, end };
};

export const formatDateForDB = (date: Date): Date => {
  return utcMidnight(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
};

// Parse date string in YYYY-MM-DD format as UTC midnight
export const parseDateString = (dateString: string): Date => {
  const [year, month, day] = dateString.split('-').map(Number);
  return utcMidnight(year, month - 1, day);
};

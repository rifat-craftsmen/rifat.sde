import { startOfDay, addDays, startOfMonth, endOfMonth } from 'date-fns';

export const getTomorrow = (): Date => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return startOfDay(tomorrow);
};

export const getValidDateRange = (): { start: Date; end: Date } => {
  const tomorrow = getTomorrow();
  const endDate = addDays(tomorrow, 6); // Tomorrow + 6 days = 7 day window
  return { start: tomorrow, end: endDate };
};

export const isDateInValidWindow = (date: Date): boolean => {
  const { start, end } = getValidDateRange();
  const targetDate = startOfDay(date);
  return targetDate >= start && targetDate <= end;
};

export const getCurrentMonthRange = (): { start: Date; end: Date } => {
  const now = new Date();
  return {
    start: startOfMonth(now),
    end: endOfMonth(now),
  };
};

export const formatDateForDB = (date: Date): Date => {
  return startOfDay(date);
};
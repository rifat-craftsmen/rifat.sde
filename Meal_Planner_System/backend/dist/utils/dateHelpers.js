import { addDays } from 'date-fns';
// Create a UTC midnight date for the given year/month/day
const utcMidnight = (year, month, day) => {
    return new Date(Date.UTC(year, month, day));
};
// Get today as UTC midnight
const getUTCToday = () => {
    const now = new Date();
    return utcMidnight(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
};
export const getTomorrow = () => {
    return addDays(getUTCToday(), 1);
};
export const getValidDateRange = () => {
    const tomorrow = getTomorrow();
    const endDate = addDays(tomorrow, 6); // Tomorrow + 6 days = 7 day window
    return { start: tomorrow, end: endDate };
};
export const isDateInValidWindow = (date) => {
    const { start, end } = getValidDateRange();
    return date >= start && date <= end;
};
export const getCurrentMonthRange = () => {
    const now = new Date();
    const start = utcMidnight(now.getUTCFullYear(), now.getUTCMonth(), 1);
    // Day 0 of next month = last day of current month
    const end = utcMidnight(now.getUTCFullYear(), now.getUTCMonth() + 1, 0);
    return { start, end };
};
export const formatDateForDB = (date) => {
    return utcMidnight(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
};
// Parse date string in YYYY-MM-DD format as UTC midnight
export const parseDateString = (dateString) => {
    const [year, month, day] = dateString.split('-').map(Number);
    return utcMidnight(year, month - 1, day);
};

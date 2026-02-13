import { startOfDay, addDays, startOfMonth, endOfMonth } from 'date-fns';
export const getTomorrow = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return startOfDay(tomorrow);
};
export const getValidDateRange = () => {
    const tomorrow = getTomorrow();
    const endDate = addDays(tomorrow, 6); // Tomorrow + 6 days = 7 day window
    return { start: tomorrow, end: endDate };
};
export const isDateInValidWindow = (date) => {
    const { start, end } = getValidDateRange();
    const targetDate = startOfDay(date);
    return targetDate >= start && targetDate <= end;
};
export const getCurrentMonthRange = () => {
    const now = new Date();
    return {
        start: startOfMonth(now),
        end: endOfMonth(now),
    };
};
export const formatDateForDB = (date) => {
    return startOfDay(date);
};

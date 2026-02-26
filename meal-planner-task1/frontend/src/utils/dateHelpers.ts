import { addDays, startOfDay, format } from 'date-fns';

export const getTomorrow = (): Date => {
    return addDays(startOfDay(new Date()), 1);
};

export const formatDateForAPI = (date: Date): string => {
    return format(date, 'yyyy-MM-dd');
};

export const isToday = (date: Date): boolean => {
    const today = startOfDay(new Date());
    const checkDate = startOfDay(date);
    return today.getTime() === checkDate.getTime();
};

export const isPast = (date: Date): boolean => {
    const today = startOfDay(new Date());
    const checkDate = startOfDay(date);
    return checkDate.getTime() < today.getTime();
};

export const getNext7Days = (): Date[] => {
    const tomorrow = getTomorrow();
    return Array.from({ length: 7 }, (_, i) => addDays(tomorrow, i));
};

export const formatDisplayDate = (date: Date): string => {
    return format(date, 'EEE, MMM d');
};

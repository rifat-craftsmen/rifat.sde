import { startOfDay } from 'date-fns';
import { prisma } from '../config/prismaClient.js';
import { formatDateForDB, isDateInValidWindow, getValidDateRange, getCurrentMonthRange, parseDateString } from '../utils/dateHelpers';
import { MealUpdateData } from '../types';

// Get user's 7-day schedule
export const getMySchedule = async (userId: number, startDate?: Date) => {
  const { start, end } = getValidDateRange();

  // Get meal records for the valid window
  const records = await prisma.mealRecord.findMany({
    where: {
      userId,
      date: {
        gte: start,
        lte: end,
      },
    },
    orderBy: { date: 'asc' },
  });

  // Get meal schedules for special occasions
  const schedules = await prisma.mealSchedule.findMany({
    where: {
      date: {
        gte: start,
        lte: end,
      },
    },
  });

  // Build 7-day grid
  const scheduleArray = [];
  const today = startOfDay(new Date());

  for (let i = 0; i < 7; i++) {
    const currentDate = new Date(start);
    currentDate.setDate(currentDate.getDate() + i);
    const formattedDate = formatDateForDB(currentDate);

    const record = records.find((r) => r.date.getTime() === formattedDate.getTime());
    const schedule = schedules.find((s) => s.date.getTime() === formattedDate.getTime());

    scheduleArray.push({
      date: formattedDate.toISOString(),
      isToday: formattedDate.getTime() === today.getTime(),
      isPast: formattedDate.getTime() < today.getTime(),
      record: record || null,
      schedule: {
        lunchEnabled: schedule?.lunchEnabled ?? true,
        snacksEnabled: schedule?.snacksEnabled ?? true,
        iftarEnabled: schedule?.iftarEnabled ?? false,
        eventDinnerEnabled: schedule?.eventDinnerEnabled ?? false,
        optionalDinnerEnabled: schedule?.optionalDinnerEnabled ?? false,
        occasionName: schedule?.occasionName,
      },
    });
  }

  return { schedule: scheduleArray };
};

// Add or update meal record
export const addOrUpdateMealRecord = async (
  userId: number,
  data: MealUpdateData,  // this will be an object with 5 types
  modifiedBy?: number
) => {
  // Parse date string in YYYY-MM-DD format without timezone shift
  const targetDate = parseDateString(data.date);

  // Validate date is in valid window
  if (!isDateInValidWindow(targetDate)) {
    throw new Error('Can only add/edit meals for next 7 days');
  }

  // Get meal schedule for this date (if exists)
  const schedule = await prisma.mealSchedule.findUnique({
    where: { date: targetDate },
  });

  // Check if record exists
  const existingRecord = await prisma.mealRecord.findUnique({
    where: {
      userId_date: {
        userId,
        date: targetDate,
      },
    },
  });

  if (existingRecord) {
    // Update existing record
    return await prisma.mealRecord.update({
      where: {
        userId_date: {
          userId,
          date: targetDate,
        },
      },
      data: {
        lunch: data.lunch,
        snacks: data.snacks,
        iftar: data.iftar,
        eventDinner: data.eventDinner,
        optionalDinner: data.optionalDinner,
        lastModifiedBy: modifiedBy || null,
        notificationSent: false,
      },
    });
  } else {
    // Create new record
    return await prisma.mealRecord.create({
      data: {
        userId,
        date: targetDate,
        lunch: data.lunch,
        snacks: data.snacks,
        iftar: data.iftar,
        eventDinner: data.eventDinner,
        optionalDinner: data.optionalDinner,
        lastModifiedBy: modifiedBy || null,
        notificationSent: false,
      },
    });
  }
};




// Get monthly stats
export const getMyStats = async (userId: number) => {
  const { start, end } = getCurrentMonthRange();

  const records = await prisma.mealRecord.findMany({
    where: {
      userId,
      date: {
        gte: start,
        lte: end,
      },
    },
  });

  const totalMeals = records.reduce((sum, record) => {
    return (
      sum +
      (record.lunch ? 1 : 0) +
      (record.snacks ? 1 : 0) +
      (record.iftar ? 1 : 0) +
      (record.eventDinner ? 1 : 0) +
      (record.optionalDinner ? 1 : 0)
    );
  }, 0);

  return {
    month: start.toLocaleString('default', { month: 'long' }),
    year: start.getFullYear(),
    totalMeals,
    breakdown: {
      lunch: records.filter((r) => r.lunch).length,
      snacks: records.filter((r) => r.snacks).length,
      iftar: records.filter((r) => r.iftar).length,
      eventDinner: records.filter((r) => r.eventDinner).length,
      optionalDinner: records.filter((r) => r.optionalDinner).length,
    },
  };
};
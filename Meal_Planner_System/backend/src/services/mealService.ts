import { prisma } from '../config/prismaClient.js';
import { formatDateForDB, isDateInValidWindow, getValidDateRange, getCurrentMonthRange } from '../utils/dateHelpers';
import { MealUpdateData } from '../types';

// Get user's 7-day schedule
export const getMySchedule = async (userId: number, startDate: Date) => {
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
  const days = [];
  for (let i = 0; i < 7; i++) {
    const currentDate = new Date(start);
    currentDate.setDate(currentDate.getDate() + i);
    const formattedDate = formatDateForDB(currentDate);

    const record = records.find((r) => r.date.getTime() === formattedDate.getTime());
    const schedule = schedules.find((s) => s.date.getTime() === formattedDate.getTime());

    days.push({
      date: formattedDate,
      lunch: record?.lunch ?? true,
      snacks: record?.snacks ?? true,
      iftar: record?.iftar ?? false,
      eventDinner: record?.eventDinner ?? false,
      optionalDinner: record?.optionalDinner ?? false,
      lunchAvailable: schedule?.lunchEnabled ?? true,
      snacksAvailable: schedule?.snacksEnabled ?? true,
      iftarAvailable: schedule?.iftarEnabled ?? false,
      eventDinnerAvailable: schedule?.eventDinnerEnabled ?? false,
      optionalDinnerAvailable: schedule?.optionalDinnerEnabled ?? false,
      occasionName: schedule?.occasionName,
      recordExists: !!record,
    });
  }

  return { days };
};

// Add or update meal record
export const addOrUpdateMealRecord = async (
  userId: number,
  data: MealUpdateData,
  modifiedBy?: number
) => {
  const targetDate = formatDateForDB(new Date(data.date));

  // Validate date is in valid window
  if (!isDateInValidWindow(targetDate)) {
    throw new Error('Can only add/edit meals for tomorrow through next 6 days');
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
        notificationSent: modifiedBy ? false : true, // Set false if modified by others
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
        notificationSent: modifiedBy ? false : true,
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
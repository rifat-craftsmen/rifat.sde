import cron from 'node-cron';
import { prisma } from '../config/prismaClient.js';
import { getTomorrow, formatDateForDB } from '../utils/dateHelpers';
import e from 'express';

export const createTomorrowRecords = async () => {
  console.log('Starting daily record creation job...');

  try {
    const tomorrow = getTomorrow();

    // Step 1: Get all active employees
    const activeUsers = await prisma.user.findMany({
      where: { status: 'ACTIVE' },
      select: { id: true },
    });

    console.log(`Found ${activeUsers.length} active employees`);

    // Step 2: Check if MealSchedule exists for tomorrow
    const schedule = await prisma.mealSchedule.findUnique({
      where: { date: tomorrow },
    });

    // Step 3: Determine meal defaults
    // const defaults = {
    //   lunch: schedule?.lunchEnabled ?? true,
    //   snacks: schedule?.snacksEnabled ?? true,
    //   iftar: schedule?.iftarEnabled ?? false,
    //   eventDinner: schedule?.eventDinnerEnabled ?? false,
    //   optionalDinner: schedule?.optionalDinnerEnabled ?? false,
    // };

    const defaults = {
      lunch: schedule?.lunchEnabled,
      snacks: schedule?.snacksEnabled,
      iftar: schedule?.iftarEnabled,
      eventDinner: schedule?.eventDinnerEnabled,
      optionalDinner: schedule?.optionalDinnerEnabled,
    };

    console.log('Meal defaults:', defaults);
    if (schedule?.occasionName) {
      console.log(`Special occasion: ${schedule.occasionName}`);
    }

    // Step 4: Create records only for users who don't have one yet
    let createdCount = 0;
    let updatedCount = 0;

    for (const user of activeUsers) {
      // Check if record already exists
      const existingRecord = await prisma.mealRecord.findUnique({
        where: {
          userId_date: {
            userId: user.id,
            date: tomorrow,
          },
        },
      });

      if (existingRecord) {
        await prisma.mealRecord.update({
          where: { id: existingRecord.id },
          data: {
            // If lunch is users choice (true/false), keep it; else if, lunch is null, use defaults.lunch 
            lunch: existingRecord.lunch ?? defaults.lunch,
            snacks: existingRecord.snacks ?? defaults.snacks,
            iftar: existingRecord.iftar ?? defaults.iftar,
            eventDinner: existingRecord.eventDinner ?? defaults.eventDinner,
            optionalDinner: existingRecord.optionalDinner ?? defaults.optionalDinner,
          },
        });
        updatedCount++;
      }
      else {
        // Create new record with defaults
        await prisma.mealRecord.create({
          data: {
            userId: user.id,
            date: tomorrow,
            ...defaults,
            lastModifiedBy: null, // System-generated
            notificationSent: false,
          },
        });
        createdCount++;
      }
    }





    console.log(`Created ${createdCount} new records`);
    console.log(`updated ${updatedCount} records`);
    console.log(`Records created for: ${tomorrow.toDateString()}`);
  } catch (error) {
    console.error('Daily record creation failed:', error);
  }
};

// Schedule: Every day at 9 PM
export const startDailyRecordJob = () => {
  cron.schedule('0 21 * * *', createTomorrowRecords);
  console.log('Daily record creation job scheduled (9 PM)');
};
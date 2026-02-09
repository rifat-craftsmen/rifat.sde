import cron from 'node-cron';
import {prisma} from '../config/prismaClient.js';
import { getTomorrow, formatDateForDB } from '../utils/dateHelpers';

export const createTomorrowRecords = async () => {
  console.log('🕐 Starting daily record creation job...');

  try {
    const tomorrow = getTomorrow();

    // Step 1: Get all active employees
    const activeUsers = await prisma.user.findMany({
      where: { status: 'ACTIVE' },
      select: { id: true },
    });

    console.log(`📋 Found ${activeUsers.length} active employees`);

    // Step 2: Check if MealSchedule exists for tomorrow
    const schedule = await prisma.mealSchedule.findUnique({
      where: { date: tomorrow },
    });

    // Step 3: Determine meal defaults
    const defaults = {
      lunch: schedule?.lunchEnabled ?? true,
      snacks: schedule?.snacksEnabled ?? true,
      iftar: schedule?.iftarEnabled ?? false,
      eventDinner: schedule?.eventDinnerEnabled ?? false,
      optionalDinner: schedule?.optionalDinnerEnabled ?? false,
    };

    console.log('🍽️  Meal defaults:', defaults);
    if (schedule?.occasionName) {
      console.log(`🎉 Special occasion: ${schedule.occasionName}`);
    }

    // Step 4: Create records only for users who don't have one yet
    let createdCount = 0;
    let skippedCount = 0;

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
        // User already created their own record - skip
        skippedCount++;
        continue;
      }

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

    console.log(`✅ Created ${createdCount} new records`);
    console.log(`⏭️  Skipped ${skippedCount} users (already have records)`);
    console.log(`📅 Records created for: ${tomorrow.toDateString()}`);
  } catch (error) {
    console.error('❌ Daily record creation failed:', error);
  }
};

// Schedule: Every day at 12:00 AM
export const startDailyRecordJob = () => {
  cron.schedule('0 0 * * *', createTomorrowRecords);
  console.log('⏰ Daily record creation job scheduled (12:00 AM)');
};
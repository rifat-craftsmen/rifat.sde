import { prisma } from '../config/prismaClient.js';
import { formatDateForDB, parseDateString, getCurrentMonthRange } from '../utils/dateHelpers';
import { CreateScheduleData, BulkMealUpdateData, CreateGlobalWFHData } from '../types';

// Get all teams
export const getAllTeams = async () => {
  return await prisma.team.findMany({
    select: {
      id: true,
      name: true,
      leadId: true,
      lead: {
        select: {
          id: true,
          name: true,
        },
      },
    },
    orderBy: { name: 'asc' },
  });
};

// Get all employees or search
export const searchEmployees = async (searchQuery?: string) => {
  return await prisma.user.findMany({
    where: searchQuery
      ? {
          OR: [
            { name: { contains: searchQuery, mode: 'insensitive' } },
            { email: { contains: searchQuery, mode: 'insensitive' } },
          ],
        }
      : {},
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      status: true,
      teamId: true,
      team: {
        select: {
          name: true,
        },
      },
    },
    orderBy: { name: 'asc' },
  });
};

// Get team members (for Team Leads)
export const getTeamMembers = async (teamId: number) => {
  return await prisma.user.findMany({
    where: { teamId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      status: true,
    },
    orderBy: { name: 'asc' },
  });
};

// Create or update meal schedule
export const createMealSchedule = async (data: CreateScheduleData, createdBy: number) => {
  const targetDate = parseDateString(data.date);

  return await prisma.mealSchedule.upsert({
    where: { date: targetDate },
    update: {
      lunchEnabled: data.lunchEnabled,
      snacksEnabled: data.snacksEnabled,
      iftarEnabled: data.iftarEnabled,
      eventDinnerEnabled: data.eventDinnerEnabled,
      optionalDinnerEnabled: data.optionalDinnerEnabled,
      occasionName: data.occasionName || null,
      createdBy,
    },
    create: {
      date: targetDate,
      lunchEnabled: data.lunchEnabled,
      snacksEnabled: data.snacksEnabled,
      iftarEnabled: data.iftarEnabled,
      eventDinnerEnabled: data.eventDinnerEnabled,
      optionalDinnerEnabled: data.optionalDinnerEnabled,
      occasionName: data.occasionName || null,
      createdBy,
    },
  });
};

// Get all meal schedules
export const getAllMealSchedules = async () => {
  return await prisma.mealSchedule.findMany({
    orderBy: { date: 'desc' },
  });
};

// Get meal schedule for a date
export const getMealSchedule = async (date: Date) => {
  const targetDate = formatDateForDB(date);
  return await prisma.mealSchedule.findUnique({
    where: { date: targetDate },
  });
};

// Delete meal schedule
export const deleteMealSchedule = async (scheduleId: number) => {
  return await prisma.mealSchedule.delete({
    where: { id: scheduleId },
  });
};

// Get daily headcount
export const getDailyHeadcount = async (date: Date) => {
  const targetDate = formatDateForDB(date);

  // Get all records with user and team data
  const records = await prisma.mealRecord.findMany({
    where: { date: targetDate },
    include: {
      user: {
        select: {
          teamId: true,
          team: {
            select: { name: true }
          }
        }
      }
    }
  });

  // Check if date falls within global WFH period
  const globalWFH = await prisma.globalWFHPeriod.findFirst({
    where: {
      dateFrom: { lte: targetDate },
      dateTo: { gte: targetDate }
    }
  });

  // Get occasion name from meal schedule for this date
  const mealSchedule = await prisma.mealSchedule.findUnique({
    where: { date: targetDate },
    select: { occasionName: true }
  });

  // Meal totals
  const mealTotals = {
    lunch: records.filter(r => r.lunch).length,
    snacks: records.filter(r => r.snacks).length,
    iftar: records.filter(r => r.iftar).length,
    eventDinner: records.filter(r => r.eventDinner).length,
    optionalDinner: records.filter(r => r.optionalDinner).length,
  };

  // Team breakdown with meal type counts
  const teamMap = new Map<number, {
    teamName: string,
    totalMeals: number,
    lunch: number,
    snacks: number,
    iftar: number,
    eventDinner: number,
    optionalDinner: number
  }>();

  records.forEach(record => {
    const teamId = record.user.teamId;
    if (!teamId) return;

    const mealCount = [
      record.lunch, record.snacks, record.iftar,
      record.eventDinner, record.optionalDinner
    ].filter(Boolean).length;

    if (teamMap.has(teamId)) {
      const team = teamMap.get(teamId)!;
      team.totalMeals += mealCount;
      team.lunch += record.lunch ? 1 : 0;
      team.snacks += record.snacks ? 1 : 0;
      team.iftar += record.iftar ? 1 : 0;
      team.eventDinner += record.eventDinner ? 1 : 0;
      team.optionalDinner += record.optionalDinner ? 1 : 0;
    } else {
      teamMap.set(teamId, {
        teamName: record.user.team?.name || 'Unknown',
        totalMeals: mealCount,
        lunch: record.lunch ? 1 : 0,
        snacks: record.snacks ? 1 : 0,
        iftar: record.iftar ? 1 : 0,
        eventDinner: record.eventDinner ? 1 : 0,
        optionalDinner: record.optionalDinner ? 1 : 0
      });
    }
  });

  const teamBreakdown = Array.from(teamMap.entries()).map(([teamId, data]) => ({
    teamId,
    teamName: data.teamName,
    totalMeals: data.totalMeals,
    lunch: data.lunch,
    snacks: data.snacks,
    iftar: data.iftar,
    eventDinner: data.eventDinner,
    optionalDinner: data.optionalDinner
  }));

  // Work location split
  const officeCount = records.filter(r => !r.workFromHome).length;
  const wfhCount = records.filter(r => r.workFromHome).length;

  // Overall total (sum of all meals)
  const overallTotal = Object.values(mealTotals).reduce((sum, count) => sum + count, 0);

  return {
    date: targetDate,
    mealTotals,
    teamBreakdown,
    workLocationSplit: { office: officeCount, wfh: wfhCount },
    overallTotal,
    globalWFHActive: !!globalWFH,
    globalWFHNote: globalWFH?.note || null,
    occasionName: mealSchedule?.occasionName || null
  };
};

// Get daily participation (employee-level meal data)
// Fetches ALL active employees and their meal records for the date (LEFT JOIN)
export const getDailyParticipation = async (date: Date, teamId?: number) => {
  const targetDate = formatDateForDB(date);

  // Fetch all active users (with optional team filter)
  const users = await prisma.user.findMany({
    where: {
      status: 'ACTIVE',
      ...(teamId && { teamId: teamId })
    },
    select: {
      id: true,
      name: true,
      team: {
        select: { name: true }
      },
      records: {
        where: { date: targetDate },
        take: 1,
        select: {
          lunch: true,
          snacks: true,
          iftar: true,
          eventDinner: true,
          optionalDinner: true,
          workFromHome: true,
          lastModifiedBy: true,
          updatedAt: true,
        }
      }
    },
    orderBy: { name: 'asc' }
  });

  // Collect unique modifier IDs to resolve their names in one query
  const modifierIds = [...new Set(
    users
      .map(u => u.records[0]?.lastModifiedBy)
      .filter((id): id is number => id != null)
  )];

  const modifiers = modifierIds.length > 0
    ? await prisma.user.findMany({
        where: { id: { in: modifierIds } },
        select: { id: true, name: true }
      })
    : [];

  const modifierMap = new Map(modifiers.map(m => [m.id, m.name]));

  // Count WFH days per user for the current calendar month in one query
  const { start: monthStart, end: monthEnd } = getCurrentMonthRange();
  const wfhCounts = await prisma.mealRecord.groupBy({
    by: ['userId'],
    where: {
      userId: { in: users.map(u => u.id) },
      date: { gte: monthStart, lte: monthEnd },
      workFromHome: true,
    },
    _count: { id: true },
  });
  const wfhCountMap = new Map(wfhCounts.map(r => [r.userId, r._count.id]));

  const employees = users.map(user => {
    const record = user.records[0]; // Will be undefined if no record exists
    const wfhDaysThisMonth = wfhCountMap.get(user.id) ?? 0;

    return {
      id: user.id,
      name: user.name,
      teamName: user.team?.name || null,
      workFromHome: record?.workFromHome ?? false,
      meals: {
        lunch: record?.lunch ?? null,
        snacks: record?.snacks ?? null,
        iftar: record?.iftar ?? null,
        eventDinner: record?.eventDinner ?? null,
        optionalDinner: record?.optionalDinner ?? null
      },
      lastModifiedByName: record == null
        ? null                                                    // no record at all → —
        : record.lastModifiedBy == null
          ? 'System'                                              // record exists, no user ID → cron
          : (modifierMap.get(record.lastModifiedBy) ?? null),    // user/admin/lead → their name
      lastModifiedAt: record?.updatedAt?.toISOString() ?? null,
      wfhDaysThisMonth,
    };
  });

  const wfhOverLimitCount = employees.filter(e => e.wfhDaysThisMonth > 5).length;
  const totalExtraWFHDays = employees
    .filter(e => e.wfhDaysThisMonth > 5)
    .reduce((sum, e) => sum + (e.wfhDaysThisMonth - 5), 0);

  return {
    date: targetDate.toISOString(),
    wfhOverLimitCount,
    totalExtraWFHDays,
    employees,
  };
};

// Bulk update meals for multiple employees
export const bulkUpdateMeals = async (
  data: BulkMealUpdateData,
  modifiedBy: number,
  requesterTeamId?: number
) => {
  const targetDate = parseDateString(data.date);

  // Team leads: verify all userIds belong to their team
  if (requesterTeamId) {
    const teamMembers = await prisma.user.findMany({
      where: { teamId: requesterTeamId, id: { in: data.userIds } },
      select: { id: true },
    });
    const validIds = new Set(teamMembers.map((m) => m.id));
    const invalid = data.userIds.filter((id) => !validIds.has(id));
    if (invalid.length > 0) {
      throw new Error('Some employees are not in your team');
    }
  }

  // Get meal schedule for the date to know which meals are enabled
  const schedule = await prisma.mealSchedule.findUnique({
    where: { date: targetDate },
  });

  let mealData: {
    lunch: boolean;
    snacks: boolean;
    iftar: boolean;
    eventDinner: boolean;
    optionalDinner: boolean;
    workFromHome: boolean;
  };

  switch (data.action) {
    case 'WFH_ALL':
      mealData = { lunch: false, snacks: false, iftar: false, eventDinner: false, optionalDinner: false, workFromHome: true };
      break;
    case 'ALL_OFF':
      mealData = { lunch: false, snacks: false, iftar: false, eventDinner: false, optionalDinner: false, workFromHome: false };
      break;
    case 'SET_ALL_MEALS':
      mealData = {
        lunch: schedule?.lunchEnabled !== false,
        snacks: schedule?.snacksEnabled !== false,
        iftar: schedule?.iftarEnabled ?? false,
        eventDinner: schedule?.eventDinnerEnabled ?? false,
        optionalDinner: schedule?.optionalDinnerEnabled ?? false,
        workFromHome: false,
      };
      break;
    case 'UNSET_ALL_MEALS':
      mealData = { lunch: false, snacks: false, iftar: false, eventDinner: false, optionalDinner: false, workFromHome: false };
      break;
  }

  // Upsert records for all selected users in parallel
  const results = await Promise.all(
    data.userIds.map((userId) =>
      prisma.mealRecord.upsert({
        where: { userId_date: { userId, date: targetDate } },
        update: { ...mealData, lastModifiedBy: modifiedBy, notificationSent: false },
        create: { userId, date: targetDate, ...mealData, lastModifiedBy: modifiedBy },
      })
    )
  );

  return { updated: results.length };
};

// Create a global WFH period.
// Only writes records for TODAY if today falls within the period.
// Future dates are handled day-by-day by the nightly cron job.
export const createGlobalWFHPeriod = async (data: CreateGlobalWFHData, createdBy: number) => {
  const dateFrom = parseDateString(data.dateFrom);
  const dateTo = parseDateString(data.dateTo);

  if (dateTo < dateFrom) {
    throw new Error('End date must be on or after start date');
  }

  // Create the period record
  const period = await prisma.globalWFHPeriod.create({
    data: {
      dateFrom,
      dateTo,
      note: data.note || null,
      createdBy,
    },
  });

  // If today falls within the period, immediately upsert WFH records for all active employees.
  // Future dates will be picked up by the nightly cron at 9 PM.
  const today = formatDateForDB(new Date());
  const isToday = today.getTime() >= dateFrom.getTime() && today.getTime() <= dateTo.getTime();

  if (isToday) {
    const activeUsers = await prisma.user.findMany({
      where: { status: 'ACTIVE' },
      select: { id: true },
    });

    await Promise.all(
      activeUsers.map((user) =>
        prisma.mealRecord.upsert({
          where: { userId_date: { userId: user.id, date: today } },
          update: {
            workFromHome: true,
            lunch: false,
            snacks: false,
            iftar: false,
            eventDinner: false,
            optionalDinner: false,
            lastModifiedBy: createdBy,
            notificationSent: false,
          },
          create: {
            userId: user.id,
            date: today,
            workFromHome: true,
            lunch: false,
            snacks: false,
            iftar: false,
            eventDinner: false,
            optionalDinner: false,
            lastModifiedBy: createdBy,
          },
        })
      )
    );
  }

  return period;
};

// Get all global WFH periods
export const getAllGlobalWFHPeriods = async () => {
  return await prisma.globalWFHPeriod.findMany({
    orderBy: { dateFrom: 'desc' },
  });
};

// Delete a global WFH period
export const deleteGlobalWFHPeriod = async (id: number) => {
  return await prisma.globalWFHPeriod.delete({
    where: { id },
  });
};
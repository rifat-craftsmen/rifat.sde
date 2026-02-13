import { prisma } from '../config/prismaClient.js';
import { formatDateForDB } from '../utils/dateHelpers';
// Get all employees or search
export const searchEmployees = async (searchQuery) => {
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
export const getTeamMembers = async (teamId) => {
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
export const createMealSchedule = async (data, createdBy) => {
    const targetDate = formatDateForDB(new Date(data.date));
    return await prisma.mealSchedule.upsert({
        where: { date: targetDate },
        update: {
            lunchEnabled: data.lunchEnabled,
            snacksEnabled: data.snacksEnabled,
            iftarEnabled: data.iftarEnabled,
            eventDinnerEnabled: data.eventDinnerEnabled,
            optionalDinnerEnabled: data.optionalDinnerEnabled,
            occasionName: data.occasionName,
            createdBy,
        },
        create: {
            date: targetDate,
            lunchEnabled: data.lunchEnabled,
            snacksEnabled: data.snacksEnabled,
            iftarEnabled: data.iftarEnabled,
            eventDinnerEnabled: data.eventDinnerEnabled,
            optionalDinnerEnabled: data.optionalDinnerEnabled,
            occasionName: data.occasionName,
            createdBy,
        },
    });
};
// Get meal schedule for a date
export const getMealSchedule = async (date) => {
    const targetDate = formatDateForDB(date);
    return await prisma.mealSchedule.findUnique({
        where: { date: targetDate },
    });
};
// Delete meal schedule
export const deleteMealSchedule = async (scheduleId) => {
    return await prisma.mealSchedule.delete({
        where: { id: scheduleId },
    });
};
// Get daily headcount
export const getDailyHeadcount = async (date) => {
    const targetDate = formatDateForDB(date);
    const records = await prisma.mealRecord.findMany({
        where: { date: targetDate },
    });
    return {
        date: targetDate,
        lunch: records.filter((r) => r.lunch).length,
        snacks: records.filter((r) => r.snacks).length,
        iftar: records.filter((r) => r.iftar).length,
        eventDinner: records.filter((r) => r.eventDinner).length,
        optionalDinner: records.filter((r) => r.optionalDinner).length,
        totalEmployees: records.length,
    };
};

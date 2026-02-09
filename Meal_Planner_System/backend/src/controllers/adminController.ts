import { Response } from 'express';
import { AuthRequest } from '../types';
import {
    searchEmployees,
    getTeamMembers,
    createMealSchedule,
    getMealSchedule,
    deleteMealSchedule,
    getDailyHeadcount,
} from '../services/adminService';
import { getMySchedule, addOrUpdateMealRecord } from '../services/mealService';

export const getEmployees = async (req: AuthRequest, res: Response) => {
    try {
        const searchQuery = req.query.search as string | undefined;
        const employees = await searchEmployees(searchQuery);
        return res.json({ employees });
    } catch (error: any) {
        return res.status(500).json({ error: error.message });
    }
};

export const getMyTeamMembers = async (req: AuthRequest, res: Response) => {
    try {
        const teamId = req.user!.teamId;
        if (!teamId) {
            return res.status(400).json({ error: 'No team assigned' });
        }

        const members = await getTeamMembers(teamId);
        return res.json({ members });
    } catch (error: any) {
        return res.status(500).json({ error: error.message });
    }
};

export const getEmployeeSchedule = async (req: AuthRequest, res: Response) => {
    try {

        const userIdParam = req.params.userId;
        const idToParse = Array.isArray(userIdParam) ? userIdParam[0] : userIdParam;
        const targetUserId = parseInt(idToParse);


        const startDate = req.query.date ? new Date(req.query.date as string) : new Date();

        const schedule = await getMySchedule(targetUserId, startDate);
        return res.json(schedule);
    } catch (error: any) {
        return res.status(500).json({ error: error.message });
    }
};

export const updateEmployeeMeals = async (req: AuthRequest, res: Response) => {
    try {
        const userIdParam = req.params.userId;
        const idToParse = Array.isArray(userIdParam) ? userIdParam[0] : userIdParam;
        const targetUserId = parseInt(idToParse);
        const currentUserId = req.user!.userId;
        const data = req.body;

        const record = await addOrUpdateMealRecord(targetUserId, data, currentUserId);
        return res.json({ success: true, record });
    } catch (error: any) {
        return res.status(400).json({ error: error.message });
    }
};

export const createSchedule = async (req: AuthRequest, res: Response) => {
    try {
        const createdBy = req.user!.userId;
        const schedule = await createMealSchedule(req.body, createdBy);
        return res.json({ success: true, schedule });
    } catch (error: any) {
        return res.status(400).json({ error: error.message });
    }
};

export const getSchedule = async (req: AuthRequest, res: Response) => {
    try {
        const date = new Date(req.query.date as string);
        const schedule = await getMealSchedule(date);
        return res.json({ schedule });
    } catch (error: any) {
        return res.status(500).json({ error: error.message });
    }
};

export const deleteSchedule = async (req: AuthRequest, res: Response) => {
    try {
        const scheduleIdParam = req.params.id;
        const idToParse = Array.isArray(scheduleIdParam) ? scheduleIdParam[0] : scheduleIdParam;
        const scheduleId = parseInt(idToParse);
        await deleteMealSchedule(scheduleId);
        return res.json({ success: true });
    } catch (error: any) {
        return res.status(500).json({ error: error.message });
    }
};

export const getHeadcount = async (req: AuthRequest, res: Response) => {
    try {
        const date = req.query.date ? new Date(req.query.date as string) : new Date();
        const headcount = await getDailyHeadcount(date);
        return res.json(headcount);
    } catch (error: any) {
        return res.status(500).json({ error: error.message });
    }
};
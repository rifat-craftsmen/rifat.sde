import { searchEmployees, getTeamMembers, getAllTeams, createMealSchedule, getAllMealSchedules, deleteMealSchedule, getDailyHeadcount, } from '../services/adminService';
import { getMySchedule, addOrUpdateMealRecord } from '../services/mealService';
export const getEmployees = async (req, res) => {
    try {
        const searchQuery = req.query.search;
        const employees = await searchEmployees(searchQuery);
        return res.json({ employees });
    }
    catch (error) {
        return res.status(500).json({ error: error.message });
    }
};
export const getTeams = async (req, res) => {
    try {
        const teams = await getAllTeams();
        return res.json({ teams });
    }
    catch (error) {
        return res.status(500).json({ error: error.message });
    }
};
export const getMyTeamMembers = async (req, res) => {
    try {
        const teamId = req.user.teamId;
        if (!teamId) {
            return res.status(400).json({ error: 'No team assigned' });
        }
        const members = await getTeamMembers(teamId);
        return res.json({ members });
    }
    catch (error) {
        return res.status(500).json({ error: error.message });
    }
};
export const getEmployeeSchedule = async (req, res) => {
    try {
        const userIdParam = req.params.userId;
        const idToParse = Array.isArray(userIdParam) ? userIdParam[0] : userIdParam;
        const targetUserId = parseInt(idToParse);
        const startDate = req.query.date ? new Date(req.query.date) : new Date();
        const schedule = await getMySchedule(targetUserId, startDate);
        return res.json(schedule);
    }
    catch (error) {
        return res.status(500).json({ error: error.message });
    }
};
export const updateEmployeeMeals = async (req, res) => {
    try {
        const userIdParam = req.params.userId;
        const idToParse = Array.isArray(userIdParam) ? userIdParam[0] : userIdParam;
        const targetUserId = parseInt(idToParse);
        const currentUserId = req.user.userId;
        const data = req.body;
        const record = await addOrUpdateMealRecord(targetUserId, data, currentUserId);
        return res.json({ success: true, record });
    }
    catch (error) {
        return res.status(400).json({ error: error.message });
    }
};
export const createSchedule = async (req, res) => {
    try {
        const createdBy = req.user.userId;
        const schedule = await createMealSchedule(req.body, createdBy);
        return res.json({ success: true, schedule });
    }
    catch (error) {
        return res.status(400).json({ error: error.message });
    }
};
export const getSchedule = async (req, res) => {
    try {
        const schedules = await getAllMealSchedules();
        return res.json({ schedules });
    }
    catch (error) {
        return res.status(500).json({ error: error.message });
    }
};
export const deleteSchedule = async (req, res) => {
    try {
        const scheduleIdParam = req.params.id;
        const idToParse = Array.isArray(scheduleIdParam) ? scheduleIdParam[0] : scheduleIdParam;
        const scheduleId = parseInt(idToParse);
        await deleteMealSchedule(scheduleId);
        return res.json({ success: true });
    }
    catch (error) {
        return res.status(500).json({ error: error.message });
    }
};
export const getHeadcount = async (req, res) => {
    try {
        const date = req.query.date ? new Date(req.query.date) : new Date();
        const headcount = await getDailyHeadcount(date);
        return res.json(headcount);
    }
    catch (error) {
        return res.status(500).json({ error: error.message });
    }
};

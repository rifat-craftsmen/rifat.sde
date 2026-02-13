import { getMySchedule, addOrUpdateMealRecord, getMyStats } from '../services/mealService';
import { getTomorrow } from '../utils/dateHelpers';
export const getMyMealSchedule = async (req, res) => {
    try {
        const userId = req.user.userId;
        const startDate = req.query.startDate ? new Date(req.query.startDate) : getTomorrow();
        const schedule = await getMySchedule(userId, startDate);
        return res.json(schedule);
    }
    catch (error) {
        return res.status(500).json({ error: error.message });
    }
};
export const addOrUpdateMyMeals = async (req, res) => {
    try {
        const userId = req.user.userId;
        const data = req.body;
        const record = await addOrUpdateMealRecord(userId, data);
        return res.json({ success: true, record });
    }
    catch (error) {
        return res.status(400).json({ error: error.message });
    }
};
export const getMyMealStats = async (req, res) => {
    try {
        const userId = req.user.userId;
        const stats = await getMyStats(userId);
        return res.json(stats);
    }
    catch (error) {
        return res.status(500).json({ error: error.message });
    }
};

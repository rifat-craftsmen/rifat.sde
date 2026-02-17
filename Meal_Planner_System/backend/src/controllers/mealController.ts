import { Response } from 'express';
import { AuthRequest } from '../types';
import { getMySchedule, addOrUpdateMealRecord, getMyStats } from '../services/mealService';
import { getTomorrow } from '../utils/dateHelpers';

export const getMyMealSchedule = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const startDate = req.query.startDate ? new Date(req.query.startDate as string) : getTomorrow();

    const schedule = await getMySchedule(userId, startDate);
    return res.json(schedule);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
};

export const addOrUpdateMyMeals = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const data = req.body;

    const record = await addOrUpdateMealRecord(userId, data);
    return res.json({ success: true, record });
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
};

export const getMyMealStats = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const stats = await getMyStats(userId);
    return res.json(stats);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
};
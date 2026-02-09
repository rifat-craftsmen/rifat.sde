import { Request } from 'express';
import { Role } from '@prisma/client';

export interface AuthRequest extends Request {
  user?: {
    userId: number;
    email: string;
    role: Role;
    teamId?: number;
  };
}

export interface MealUpdateData {
  date: string;
  lunch: boolean;
  snacks: boolean;
  iftar: boolean;
  eventDinner: boolean;
  optionalDinner: boolean;
}

export interface CreateScheduleData {
  date: string;
  lunchEnabled: boolean;
  snacksEnabled: boolean;
  iftarEnabled: boolean;
  eventDinnerEnabled: boolean;
  optionalDinnerEnabled: boolean;
  occasionName?: string;
  isHoliday: boolean;
  isOfficeClosed: boolean;
}
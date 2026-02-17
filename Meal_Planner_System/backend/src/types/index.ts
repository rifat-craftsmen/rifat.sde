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
  lunch: boolean | null;
  snacks: boolean | null;
  iftar: boolean | null;
  eventDinner: boolean | null;
  optionalDinner: boolean | null;
}

export interface CreateScheduleData {
  date: string;
  lunchEnabled: boolean;
  snacksEnabled: boolean;
  iftarEnabled: boolean;
  eventDinnerEnabled: boolean;
  optionalDinnerEnabled: boolean;
  occasionName?: string;
}
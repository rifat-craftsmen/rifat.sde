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
  workFromHome?: boolean;
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

export interface BulkMealUpdateData {
  userIds: number[];
  date: string;
  action: 'WFH_ALL' | 'ALL_OFF' | 'SET_ALL_MEALS' | 'UNSET_ALL_MEALS';
}

export interface CreateGlobalWFHData {
  dateFrom: string;
  dateTo: string;
  note?: string;
}

export interface EnhancedHeadcountData {
  date: Date;
  mealTotals: {
    lunch: number;
    snacks: number;
    iftar: number;
    eventDinner: number;
    optionalDinner: number;
  };
  teamBreakdown: Array<{
    teamId: number;
    teamName: string;
    totalMeals: number;
    lunch: number;
    snacks: number;
    iftar: number;
    eventDinner: number;
    optionalDinner: number;
  }>;
  workLocationSplit: {
    office: number;
    wfh: number;
  };
  overallTotal: number;
  globalWFHActive?: boolean;
  globalWFHNote?: string | null;
}

export interface DailyParticipationData {
  date: string;
  employees: Array<{
    id: number;
    name: string;
    teamName: string | null;
    workFromHome: boolean;
    meals: {
      lunch: boolean | null;
      snacks: boolean | null;
      iftar: boolean | null;
      eventDinner: boolean | null;
      optionalDinner: boolean | null;
    };
  }>;
}
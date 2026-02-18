export type Role = 'EMPLOYEE' | 'LEAD' | 'ADMIN' | 'LOGISTICS';
export type UserStatus = 'ACTIVE' | 'INACTIVE';

export interface User {
    id: number;
    name: string;
    email: string;
    role: Role;
    status: UserStatus;
    teamId?: number;
    team?: {
        id: number;
        name: string;
    };
}

export interface MealRecord {
    id: number;
    userId: number;
    date: string;
    lunch: boolean | null;
    snacks: boolean | null;
    iftar: boolean | null;
    eventDinner: boolean | null;
    optionalDinner: boolean | null;
    workFromHome?: boolean;
    lastModifiedBy?: number;
    updatedAt: string;
}

export interface MealSchedule {
    id: number;
    date: string;
    lunchEnabled: boolean;
    snacksEnabled: boolean;
    iftarEnabled: boolean;
    eventDinnerEnabled: boolean;
    optionalDinnerEnabled: boolean;
    occasionName?: string;
}

export interface DaySchedule {
    date: string;
    record?: MealRecord;
    schedule?: MealSchedule;
    isToday: boolean;
    isPast: boolean;
}

export interface HeadcountData {
    date: string;
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

export interface MonthlyStats {
    month: string;
    year: number;
    mealsTaken: number;
    totalMealsPlanned: number;
    breakdown: {
        lunch: number;
        snacks: number;
        iftar: number;
        eventDinner: number;
        optionalDinner: number;
    };
}

export interface LoginCredentials {
    email: string;
    password: string;
}

export interface Team {
    id: number;
    name: string;
    leadId: number;
    lead: {
        id: number;
        name: string;
    };
}

export interface CreateUserData {
    name: string;
    email: string;
    role: Role;
    teamId?: number;
    password?: string;
}

export interface UpdateUserData {
    name?: string;
    email?: string;
    role?: Role;
    teamId?: number;
    status?: UserStatus;
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

export interface UpdateMealData {
    date: string;
    lunch: boolean | null;
    snacks: boolean | null;
    iftar: boolean | null;
    eventDinner: boolean | null;
    optionalDinner: boolean | null;
    workFromHome?: boolean;
}

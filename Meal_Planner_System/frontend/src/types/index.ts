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
    lunch: number;
    snacks: number;
    iftar: number;
    eventDinner: number;
    optionalDinner: number;
    totalEmployees: number;
}

export interface MonthlyStats {
    totalMeals: number;
    lunchCount: number;
    snacksCount: number;
    iftarCount: number;
    eventDinnerCount: number;
    optionalDinnerCount: number;
}

export interface LoginCredentials {
    email: string;
    password: string;
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
    lunch: boolean;
    snacks: boolean;
    iftar: boolean;
    eventDinner: boolean;
    optionalDinner: boolean;
}

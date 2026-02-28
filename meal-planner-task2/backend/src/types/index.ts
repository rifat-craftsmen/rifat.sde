import { Request } from 'express'

export type Role = 'EMPLOYEE' | 'LEAD' | 'ADMIN' | 'LOGISTICS'
export type UserStatus = 'ACTIVE' | 'INACTIVE'
export type BulkAction = 'WFH_ALL' | 'ALL_OFF' | 'SET_ALL_MEALS' | 'UNSET_ALL_MEALS'

// ── Attached to req by discordAuth middleware ─────────────────────────────

export interface AuthRequest extends Request {
  user?: {
    userId:      string
    discordId:   string
    discordRole: Role
    teamId?:     string
  }
}

// ── DynamoDB item shapes ──────────────────────────────────────────────────

export interface UserItem {
  PK:        string        // USER#{userId}
  SK:        'PROFILE'
  userId:    string
  name:      string
  email:     string
  discordId: string
  role:      Role
  status:    UserStatus
  teamId?:   string
  teamName?: string        // denormalized from teams table
  wfhCount:  number        // atomic counter, reset each month
  wfhMonth:  string        // YYYY-MM — month the counter belongs to
  // GSI keys
  gsi1pk:    string        // discordId  → discordId-index
  gsi2pk:    string        // status     → status-index
  gsi3pk?:   string        // teamId     → team-index (only if teamId set)
  createdAt: string
  updatedAt: string
}

export interface MealRecordItem {
  PK:              string        // USER#{userId}
  SK:              string        // RECORD#{YYYY-MM-DD}
  userId:          string
  date:            string        // YYYY-MM-DD
  lunch:           boolean | null
  snacks:          boolean | null
  iftar:           boolean | null
  eventDinner:     boolean | null
  optionalDinner:  boolean | null
  workFromHome:    boolean
  lastModifiedBy?: string        // userId of whoever last changed this record
  teamId?:         string        // denormalized for headcount query
  teamName?:       string        // denormalized for headcount query
  // GSI key
  gsi4pk:          string        // RECORD#{date} → date-records-index
  createdAt:       string
  updatedAt:       string
}

export interface TeamItem {
  teamId:    string
  name:      string
  leadId:    string
  // GSI key
  gsi1pk:    string        // leadId → leadId-index
  createdAt: string
  updatedAt: string
}

export interface MealScheduleItem {
  date:                  string  // YYYY-MM-DD (PK)
  lunchEnabled:          boolean
  snacksEnabled:         boolean
  iftarEnabled:          boolean
  eventDinnerEnabled:    boolean
  optionalDinnerEnabled: boolean
  occasionName?:         string
  createdBy:             string  // userId
  createdAt:             string
  updatedAt:             string
}

export interface GlobalWfhPeriodItem {
  id:        string
  dateFrom:  string        // YYYY-MM-DD
  dateTo:    string        // YYYY-MM-DD
  note?:     string
  createdBy: string        // userId
  // GSI keys
  gsi1pk:    'WFH'         // constant → list-index
  gsi1sk:    string        // dateFrom → for sorted listing
  createdAt: string
  updatedAt: string
}

// ── Request payload shapes (from Discord bot) ────────────────────────────

export interface MealUpdateData {
  date:            string
  lunch?:          boolean | null
  snacks?:         boolean | null
  iftar?:          boolean | null
  eventDinner?:    boolean | null
  optionalDinner?: boolean | null
  workFromHome?:   boolean
}

export interface CreateScheduleData {
  date:                  string
  lunchEnabled:          boolean
  snacksEnabled:         boolean
  iftarEnabled:          boolean
  eventDinnerEnabled:    boolean
  optionalDinnerEnabled: boolean
  occasionName?:         string
}

export interface BulkMealUpdateData {
  userIds: string[]
  date:    string
  action:  BulkAction
}

export interface CreateGlobalWFHData {
  dateFrom: string
  dateTo:   string
  note?:    string
}

// ── Service / response shapes ─────────────────────────────────────────────

export interface ScheduleDayView {
  date:       string
  isToday:    boolean
  isPast:     boolean
  globalWFH:  boolean
  schedule: {
    lunchEnabled:          boolean
    snacksEnabled:         boolean
    iftarEnabled:          boolean
    eventDinnerEnabled:    boolean
    optionalDinnerEnabled: boolean
    occasionName?:         string
  } | null
  record: {
    lunch:          boolean | null
    snacks:         boolean | null
    iftar:          boolean | null
    eventDinner:    boolean | null
    optionalDinner: boolean | null
    workFromHome:   boolean
  } | null
}

export interface EnhancedHeadcountData {
  date:      string
  mealTotals: {
    lunch:          number
    snacks:         number
    iftar:          number
    eventDinner:    number
    optionalDinner: number
  }
  teamBreakdown: Array<{
    teamId:         string
    teamName:       string
    totalMeals:     number
    lunch:          number
    snacks:         number
    iftar:          number
    eventDinner:    number
    optionalDinner: number
  }>
  workLocationSplit: {
    office: number
    wfh:    number
  }
  overallTotal:     number
  globalWFHActive?: boolean
  globalWFHNote?:   string | null
  occasionName?:    string | null
}

export interface DailyParticipationData {
  date:      string
  employees: Array<{
    userId:        string
    name:          string
    teamName:      string | null
    workFromHome:  boolean
    wfhCount:      number
    meals: {
      lunch:          boolean | null
      snacks:         boolean | null
      iftar:          boolean | null
      eventDinner:    boolean | null
      optionalDinner: boolean | null
    }
    lastModifiedBy: string | null
  }>
}

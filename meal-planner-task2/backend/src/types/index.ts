import { Request } from 'express'

export type Role = 'EMPLOYEE' | 'LEAD' | 'ADMIN' | 'LOGISTICS'
export type UserStatus = 'ACTIVE' | 'INACTIVE'
export type BulkAction = 'WFH_ALL' | 'ALL_OFF' | 'SET_ALL_MEALS' | 'UNSET_ALL_MEALS'
export type AuditAction = 'CREATE' | 'UPDATE' | 'DELETE'
export type AuditEntityType = 'USER' | 'MEAL_RECORD' | 'SCHEDULE' | 'TEAM' | 'WFH_PERIOD'

// ── Attached to req by discordAuth middleware ─────────────────────────────

export interface AuthRequest extends Request {
  user?: {
    discordId: string
    role:      Role
    teamId?:   string
    platform:  'discord' | 'google'
  }
}

// ── DynamoDB item shapes ──────────────────────────────────────────────────

export interface UserItem {
  PK:        string        // USER#{discordId}
  SK:        'PROFILE'
  discordId: string
  name:      string
  email:     string
  role:      Role
  status:    UserStatus
  teamId?:   string
  teamName?: string        // denormalized from team item
  wfhCount:  number        // atomic counter, reset each month
  wfhMonth:  string        // YYYY-MM — month the counter belongs to
  createdAt: string
  updatedAt: string
}

export interface MealRecordItem {
  PK:             string        // USER#{discordId}
  SK:             string        // RECORD#{YYYY-MM-DD}
  discordId:      string
  date:           string        // YYYY-MM-DD
  lunch:          boolean | null
  snacks:         boolean | null
  iftar:          boolean | null
  eventDinner:    boolean | null
  optionalDinner: boolean | null
  workFromHome:   boolean
  teamId?:        string        // denormalized for headcount grouping
  teamName?:      string        // denormalized for headcount grouping
  createdAt:      string
  updatedAt:      string
}

export interface MealScheduleItem {
  PK:                    'SCHEDULE'
  SK:                    string        // {YYYY-MM-DD}
  date:                  string        // YYYY-MM-DD
  lunchEnabled:          boolean
  snacksEnabled:         boolean
  iftarEnabled:          boolean
  eventDinnerEnabled:    boolean
  optionalDinnerEnabled: boolean
  occasionName?:         string
  createdBy:             string        // discordId of admin who published
  createdAt:             string
  updatedAt:             string
}

export interface TeamItem {
  PK:        'TEAM'
  SK:        string        // {teamId}
  teamId:    string
  name:      string
  leadId:    string        // discordId of team lead
  memberIds?: Set<string>  // StringSet of discordIds
  createdAt: string
  updatedAt: string
}

export interface WfhPeriodItem {
  PK:        'WFHPERIOD'
  SK:        string        // {dateFrom}#{uuid}
  id:        string        // uuid portion only
  dateFrom:  string        // YYYY-MM-DD
  dateTo:    string        // YYYY-MM-DD
  note?:     string
  createdAt: string
  updatedAt: string
}

// ── Audit log item ────────────────────────────────────────────────────────

export interface AuditLogItem {
  PK:               string           // AUDIT#{entityType}#{entityId}
  SK:               string           // {timestamp}#{uuid}
  id:               string           // uuid of this entry
  timestamp:        string           // ISO 8601
  actorDiscordId:   string
  actorName:        string           // denormalized snapshot
  action:           AuditAction
  entityType:       AuditEntityType
  entityId:         string           // see entityId format in design doc
  targetDiscordId?: string           // for USER or MEAL_RECORD changes
  changes?:         Record<string, { old: unknown; new: unknown }>
  metadata?:        Record<string, unknown>
}

// ── Service return types ──────────────────────────────────────────────────

export interface ScheduleDay {
  date:      string
  isToday:   boolean
  globalWFH: boolean
  schedule:  MealScheduleItem | null
  record:    MealRecordItem | null
}

// ── Request payload shapes (from Discord interactions) ────────────────────

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

export interface UpdateScheduleData {
  lunchEnabled?:          boolean
  snacksEnabled?:         boolean
  iftarEnabled?:          boolean
  eventDinnerEnabled?:    boolean
  optionalDinnerEnabled?: boolean
  occasionName?:          string
}

export interface BulkMealUpdateData {
  discordIds: string[]
  date:       string
  action:     BulkAction
}

export interface CreateWfhPeriodData {
  dateFrom: string
  dateTo:   string
  note?:    string
}

export interface UpdateWfhPeriodData {
  dateFrom?: string
  dateTo?:   string
  note?:     string
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

export interface HeadcountData {
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
    totalMembers:   number
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
  overallTotal:  number
  occasionName?: string | null
}

export interface DailyParticipationData {
  date:      string
  employees: Array<{
    discordId:     string
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
  }>
}

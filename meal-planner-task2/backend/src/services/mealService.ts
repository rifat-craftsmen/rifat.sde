import { QueryCommand, BatchGetCommand } from '@aws-sdk/lib-dynamodb'
import { dynamo, TABLES } from '../config/dynamoClient.js'
import {
  getTodayString,
  toDateString,
  parseDateString,
  getDatesBetween,
  isDateInPeriod,
} from '../utils/dateHelpers.js'
import { addDays } from 'date-fns'
import type { MealRecordItem, MealScheduleItem, GlobalWfhPeriodItem, ScheduleDay } from '../types/index.js'

// Default schedule when no MealScheduleItem exists for a date
const DEFAULT_SCHEDULE = {
  lunchEnabled:          true,
  snacksEnabled:         true,
  iftarEnabled:          false,
  eventDinnerEnabled:    false,
  optionalDinnerEnabled: false,
}

/**
 * Fetch the 7-day meal schedule view for a user (today through today+6).
 * Today is included but locked for editing (shown as-is).
 */
export async function getMySchedule(userId: string): Promise<ScheduleDay[]> {
  const today = getTodayString()
  const end   = toDateString(addDays(parseDateString(today), 6))
  const dates = getDatesBetween(today, end)

  // 1. Query user's meal records for the 7-day range
  const recordsResult = await dynamo.send(new QueryCommand({
    TableName: TABLES.MAIN,
    KeyConditionExpression: 'PK = :pk AND SK BETWEEN :start AND :end',
    ExpressionAttributeValues: {
      ':pk':    `USER#${userId}`,
      ':start': `RECORD#${today}`,
      ':end':   `RECORD#${end}`,
    },
  }))
  const records = (recordsResult.Items ?? []) as MealRecordItem[]
  const recordsByDate = Object.fromEntries(records.map(r => [r.date, r]))

  // 2. BatchGet published schedules for all 7 dates
  const schedulesResult = await dynamo.send(new BatchGetCommand({
    RequestItems: {
      [TABLES.SCHEDULES]: { Keys: dates.map(d => ({ date: d })) },
    },
  }))
  const scheduleItems = (schedulesResult.Responses?.[TABLES.SCHEDULES] ?? []) as MealScheduleItem[]
  const schedulesByDate = Object.fromEntries(scheduleItems.map(s => [s.date, s]))

  // 3. Fetch all global WFH periods to check overlap per date
  const wfhResult = await dynamo.send(new QueryCommand({
    TableName: TABLES.WFH,
    KeyConditionExpression: 'PK = :pk',
    ExpressionAttributeValues: { ':pk': 'WFH' },
  }))
  const wfhPeriods = (wfhResult.Items ?? []) as GlobalWfhPeriodItem[]

  // 4. Build one entry per day
  return dates.map(date => ({
    date,
    isToday:   date === today,
    globalWFH: wfhPeriods.some(p => isDateInPeriod(date, p.dateFrom, p.dateTo)),
    schedule:  schedulesByDate[date] ?? ({ ...DEFAULT_SCHEDULE } as unknown as MealScheduleItem),
    record:    recordsByDate[date] ?? null,
  }))
}

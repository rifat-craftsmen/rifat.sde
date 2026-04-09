import { QueryCommand, BatchGetCommand, GetCommand, PutCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb'
import { dynamo, TABLES } from '../config/dynamoClient.js'
import {
  getTodayString,
  getNextNWeekdays,
  isDateInPeriod,
  getCurrentMonthKey,
  MEAL_WINDOW_WEEKDAYS,
} from '../utils/dateHelpers.js'
import { writeAuditLog } from './auditService.js'
import type { MealRecordItem, MealScheduleItem, WfhPeriodItem, ScheduleDay, MealUpdateData, UserItem } from '../types/index.js'

export async function createOrUpdateMealRecord(
  discordId: string,
  data: MealUpdateData,
  actorDiscordId: string,
): Promise<void> {
  const now = new Date().toISOString()

  // 1. Fetch user profile (required for denormalization + WFH counter)
  const profileResult = await dynamo.send(new GetCommand({
    TableName: TABLES.MAIN,
    Key: { PK: `USER#${discordId}`, SK: 'PROFILE' },
  }))
  if (!profileResult.Item) throw new Error('User profile not found')
  const user = profileResult.Item as UserItem

  // 2. Fetch existing meal record (to carry forward unset fields + compute WFH delta)
  const existingResult = await dynamo.send(new GetCommand({
    TableName: TABLES.MAIN,
    Key: { PK: `USER#${discordId}`, SK: `RECORD#${data.date}` },
  }))
  const existing = existingResult.Item as MealRecordItem | undefined

  // 3. Resolve WFH — carry forward if not provided
  const prevWfh = existing?.workFromHome ?? false
  const newWfh  = data.workFromHome !== undefined ? data.workFromHome : prevWfh

  // When WFH transitions (false→true or true→false), unspecified meals reset to null
  // so stale selections don't silently persist across WFH state changes.
  const wfhTransition = data.workFromHome !== undefined && data.workFromHome !== prevWfh
  const carry = <T>(incoming: T | undefined, stored: T | null | undefined): T | null =>
    incoming !== undefined ? incoming : (wfhTransition ? null : (stored ?? null))

  // 4. Upsert the meal record (carry forward existing meal fields for omitted options)
  await dynamo.send(new PutCommand({
    TableName: TABLES.MAIN,
    Item: {
      PK:             `USER#${discordId}`,
      SK:             `RECORD#${data.date}`,
      discordId,
      date:           data.date,
      lunch:          carry(data.lunch,          existing?.lunch),
      snacks:         carry(data.snacks,         existing?.snacks),
      iftar:          carry(data.iftar,          existing?.iftar),
      eventDinner:    carry(data.eventDinner,    existing?.eventDinner),
      optionalDinner: carry(data.optionalDinner, existing?.optionalDinner),
      workFromHome:   newWfh,
      teamId:         user.teamId,
      teamName:       user.teamName,
      createdAt:      existing?.createdAt ?? now,
      updatedAt:      now,
    } satisfies MealRecordItem,
  }))

  // 5. Update WFH counter on profile if work location changed
  const delta = newWfh ? (prevWfh ? 0 : 1) : (prevWfh ? -1 : 0)
  if (delta !== 0) {
    const currentMonthKey = getCurrentMonthKey()
    if (user.wfhMonth !== currentMonthKey) {
      // Month rolled over — reset counter
      await dynamo.send(new UpdateCommand({
        TableName: TABLES.MAIN,
        Key: { PK: `USER#${discordId}`, SK: 'PROFILE' },
        UpdateExpression: 'SET wfhCount = :count, wfhMonth = :month, updatedAt = :now',
        ExpressionAttributeValues: {
          ':count': Math.max(delta, 0),
          ':month': currentMonthKey,
          ':now':   now,
        },
      }))
    } else {
      await dynamo.send(new UpdateCommand({
        TableName: TABLES.MAIN,
        Key: { PK: `USER#${discordId}`, SK: 'PROFILE' },
        UpdateExpression: 'SET wfhCount = :count, updatedAt = :now',
        ExpressionAttributeValues: {
          ':count': Math.max(0, user.wfhCount + delta),
          ':now':   now,
        },
      }))
    }
  }

  // 6. Audit log
  await writeAuditLog({
    actorDiscordId,
    actorName:       actorDiscordId,
    action:          existing ? 'UPDATE' : 'CREATE',
    entityType:      'MEAL_RECORD',
    entityId:        `${discordId}#${data.date}`,
    targetDiscordId: discordId,
    changes: {
      ...(data.lunch          !== undefined && { lunch:          { old: existing?.lunch          ?? null, new: data.lunch } }),
      ...(data.snacks         !== undefined && { snacks:         { old: existing?.snacks         ?? null, new: data.snacks } }),
      ...(data.iftar          !== undefined && { iftar:          { old: existing?.iftar          ?? null, new: data.iftar } }),
      ...(data.eventDinner    !== undefined && { eventDinner:    { old: existing?.eventDinner    ?? null, new: data.eventDinner } }),
      ...(data.optionalDinner !== undefined && { optionalDinner: { old: existing?.optionalDinner ?? null, new: data.optionalDinner } }),
      ...(data.workFromHome   !== undefined && { workFromHome:   { old: prevWfh, new: newWfh } }),
    },
  })
}

// Default schedule when no MealScheduleItem exists for a date
const DEFAULT_SCHEDULE = {
  lunchEnabled:          true,
  snacksEnabled:         true,
  iftarEnabled:          false,
  eventDinnerEnabled:    false,
  optionalDinnerEnabled: false,
}

/**
 * Fetch the 7-weekday meal schedule view for a user (Mon–Fri, weekends excluded).
 * Today is included but shown as-is (past records are read-only).
 */
export async function getMySchedule(discordId: string): Promise<ScheduleDay[]> {
  const today   = getTodayString()
  const dates   = getNextNWeekdays(MEAL_WINDOW_WEEKDAYS)
  const endDate = dates[dates.length - 1]

  // 1. Query user's meal records for the weekday range
  const recordsResult = await dynamo.send(new QueryCommand({
    TableName: TABLES.MAIN,
    KeyConditionExpression: 'PK = :pk AND SK BETWEEN :start AND :end',
    ExpressionAttributeValues: {
      ':pk':    `USER#${discordId}`,
      ':start': `RECORD#${today}`,
      ':end':   `RECORD#${endDate}`,
    },
  }))
  const records = (recordsResult.Items ?? []) as MealRecordItem[]
  const recordsByDate = Object.fromEntries(records.map(r => [r.date, r]))

  // 2. BatchGet published schedules for all weekday dates
  const schedulesResult = await dynamo.send(new BatchGetCommand({
    RequestItems: {
      [TABLES.MAIN]: {
        Keys: dates.map(d => ({ PK: 'SCHEDULE', SK: d })),
      },
    },
  }))
  const scheduleItems = (schedulesResult.Responses?.[TABLES.MAIN] ?? []) as MealScheduleItem[]
  const schedulesByDate = Object.fromEntries(scheduleItems.map(s => [s.date, s]))

  // 3. Fetch all WFH periods to check overlap per date
  const wfhResult = await dynamo.send(new QueryCommand({
    TableName: TABLES.MAIN,
    KeyConditionExpression: 'PK = :pk',
    ExpressionAttributeValues: { ':pk': 'WFHPERIOD' },
  }))
  const wfhPeriods = (wfhResult.Items ?? []) as WfhPeriodItem[]

  // 4. Build one entry per weekday
  return dates.map(date => ({
    date,
    isToday:   date === today,
    globalWFH: wfhPeriods.some(p => isDateInPeriod(date, p.dateFrom, p.dateTo)),
    schedule:  schedulesByDate[date] ?? ({ ...DEFAULT_SCHEDULE } as unknown as MealScheduleItem),
    record:    recordsByDate[date] ?? null,
  }))
}

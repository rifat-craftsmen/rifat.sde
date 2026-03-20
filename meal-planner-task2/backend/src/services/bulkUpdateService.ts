import { GetCommand, QueryCommand } from '@aws-sdk/lib-dynamodb'
import { dynamo, TABLES } from '../config/dynamoClient.js'
import { createOrUpdateMealRecord } from './mealService.js'
import type { BulkAction, MealUpdateData, MealScheduleItem, UserItem } from '../types/index.js'

const DEFAULT_SCHEDULE = {
  lunchEnabled:          true,
  snacksEnabled:         true,
  iftarEnabled:          false,
  eventDinnerEnabled:    false,
  optionalDinnerEnabled: false,
}

function buildMealData(date: string, action: BulkAction, schedule: typeof DEFAULT_SCHEDULE): MealUpdateData {
  switch (action) {
    case 'WFH_ON':
      // WFH on + opt out of available meals; schedule-disabled meals reset to null
      return {
        date,
        workFromHome:   true,
        lunch:          schedule.lunchEnabled          ? false : null,
        snacks:         schedule.snacksEnabled         ? false : null,
        iftar:          schedule.iftarEnabled          ? false : null,
        eventDinner:    schedule.eventDinnerEnabled    ? false : null,
        optionalDinner: schedule.optionalDinnerEnabled ? false : null,
      }
    case 'WFH_OFF':
      // Only clear WFH; leave all meal fields exactly as they are in the DB
      return { date, workFromHome: false }
    case 'SET_AVAILABLE_MEALS':
      // Opt in to schedule-enabled meals + clear WFH; disabled meals reset to null
      return {
        date,
        workFromHome:   false,
        lunch:          schedule.lunchEnabled          ? true : null,
        snacks:         schedule.snacksEnabled         ? true : null,
        iftar:          schedule.iftarEnabled          ? true : null,
        eventDinner:    schedule.eventDinnerEnabled    ? true : null,
        optionalDinner: schedule.optionalDinnerEnabled ? true : null,
      }
    case 'UNSET_AVAILABLE_MEALS':
      // Opt out of schedule-enabled meals; disabled meals reset to null; WFH unchanged
      return {
        date,
        lunch:          schedule.lunchEnabled          ? false : null,
        snacks:         schedule.snacksEnabled         ? false : null,
        iftar:          schedule.iftarEnabled          ? false : null,
        eventDinner:    schedule.eventDinnerEnabled    ? false : null,
        optionalDinner: schedule.optionalDinnerEnabled ? false : null,
      }
    case 'UNSET_ALL_MEALS':
      // Hard opt-out: all 5 meal fields = false regardless of schedule
      // Cron only fills null, so false survives future schedule additions
      return { date, lunch: false, snacks: false, iftar: false, eventDinner: false, optionalDinner: false }
  }
}

/**
 * Applies a bulk action to all provided member IDs for a given date.
 * Returns the number of records successfully written.
 */
export async function applyBulkAction(
  memberIds:      string[],
  date:           string,
  action:         BulkAction,
  actorDiscordId: string,
): Promise<number> {
  // Fetch schedule for actions that distinguish enabled vs disabled meals
  const needsSchedule = action === 'WFH_ON' || action === 'SET_AVAILABLE_MEALS' || action === 'UNSET_AVAILABLE_MEALS'
  let schedule: typeof DEFAULT_SCHEDULE = DEFAULT_SCHEDULE
  if (needsSchedule) {
    const result = await dynamo.send(new GetCommand({
      TableName: TABLES.MAIN,
      Key: { PK: 'SCHEDULE', SK: date },
    }))
    if (result.Item) schedule = result.Item as MealScheduleItem
  }

  const data = buildMealData(date, action, schedule)

  let count = 0
  for (const memberId of memberIds) {
    try {
      await createOrUpdateMealRecord(memberId, data, actorDiscordId)
      count++
    } catch {
      // Skip members whose profiles are missing
    }
  }
  return count
}

/**
 * Returns discordIds for all active users (ADMIN bulk path).
 */
export async function getAllActiveMemberIds(): Promise<string[]> {
  const result = await dynamo.send(new QueryCommand({
    TableName:                 TABLES.MAIN,
    IndexName:                 'status-email-index',
    KeyConditionExpression:    '#status = :active',
    ExpressionAttributeNames:  { '#status': 'status' },
    ExpressionAttributeValues: { ':active': 'ACTIVE' },
  }))
  return ((result.Items ?? []) as UserItem[]).map(u => u.discordId)
}

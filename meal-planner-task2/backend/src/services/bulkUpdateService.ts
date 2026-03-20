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
    case 'WFH_ALL':
      return { date, workFromHome: true }
    case 'ALL_OFF':
      return { date, lunch: false, snacks: false, iftar: false, eventDinner: false, optionalDinner: false, workFromHome: false }
    case 'SET_ALL_MEALS':
      return {
        date,
        lunch:          schedule.lunchEnabled          ? true : undefined,
        snacks:         schedule.snacksEnabled         ? true : undefined,
        iftar:          schedule.iftarEnabled          ? true : undefined,
        eventDinner:    schedule.eventDinnerEnabled    ? true : undefined,
        optionalDinner: schedule.optionalDinnerEnabled ? true : undefined,
      }
    case 'UNSET_ALL_MEALS':
      return { date, lunch: null, snacks: null, iftar: null, eventDinner: null, optionalDinner: null }
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
  // Fetch schedule for SET_ALL_MEALS so we know which meals are enabled
  let schedule: typeof DEFAULT_SCHEDULE = DEFAULT_SCHEDULE
  if (action === 'SET_ALL_MEALS') {
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

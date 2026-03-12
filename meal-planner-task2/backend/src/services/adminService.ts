import { PutCommand, DeleteCommand, QueryCommand } from '@aws-sdk/lib-dynamodb'
import { dynamo, TABLES } from '../config/dynamoClient.js'
import { getTodayString } from '../utils/dateHelpers.js'
import { writeAuditLog } from './auditService.js'
import type { CreateScheduleData, MealScheduleItem } from '../types/index.js'

// ── Meal Schedule ─────────────────────────────────────────────────────────────

export async function createMealSchedule(
  data: CreateScheduleData,
  createdBy: string,
): Promise<void> {
  const now = new Date().toISOString()

  // Write the schedule item
  await dynamo.send(new PutCommand({
    TableName: TABLES.MAIN,
    Item: {
      PK:                    'SCHEDULE',
      SK:                    data.date,
      date:                  data.date,
      lunchEnabled:          data.lunchEnabled,
      snacksEnabled:         data.snacksEnabled,
      iftarEnabled:          data.iftarEnabled,
      eventDinnerEnabled:    data.eventDinnerEnabled,
      optionalDinnerEnabled: data.optionalDinnerEnabled,
      occasionName:          data.occasionName,
      createdBy,
      createdAt: now,
      updatedAt: now,
    } satisfies MealScheduleItem,
  }))

  await writeAuditLog({
    actorDiscordId: createdBy,
    actorName:      createdBy,   // caller can pass name; discordId used as fallback
    action:         'CREATE',
    entityType:     'SCHEDULE',
    entityId:       data.date,
    changes: {
      lunchEnabled:          { old: null, new: data.lunchEnabled },
      snacksEnabled:         { old: null, new: data.snacksEnabled },
      iftarEnabled:          { old: null, new: data.iftarEnabled },
      eventDinnerEnabled:    { old: null, new: data.eventDinnerEnabled },
      optionalDinnerEnabled: { old: null, new: data.optionalDinnerEnabled },
      occasionName:          { old: null, new: data.occasionName ?? null },
    },
  })
}

export async function getAllMealSchedules(): Promise<MealScheduleItem[]> {
  const today = getTodayString()

  const result = await dynamo.send(new QueryCommand({
    TableName: TABLES.MAIN,
    KeyConditionExpression: 'PK = :pk AND SK >= :today',
    ExpressionAttributeValues: {
      ':pk':    'SCHEDULE',
      ':today': today,
    },
  }))

  return (result.Items ?? []) as MealScheduleItem[]
}

export async function deleteMealSchedule(date: string): Promise<void> {
  await dynamo.send(new DeleteCommand({
    TableName: TABLES.MAIN,
    Key: { PK: 'SCHEDULE', SK: date },
  }))
}

export async function deleteMealScheduleWithAudit(
  date: string,
  actorDiscordId: string,
): Promise<void> {
  await deleteMealSchedule(date)
  await writeAuditLog({
    actorDiscordId,
    actorName:  actorDiscordId,
    action:     'DELETE',
    entityType: 'SCHEDULE',
    entityId:   date,
  })
}

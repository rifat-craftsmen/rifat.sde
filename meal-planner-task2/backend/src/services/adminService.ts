import { PutCommand, DeleteCommand, GetCommand, BatchGetCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb'
import { dynamo, TABLES } from '../config/dynamoClient.js'
import { getTodayString } from '../utils/dateHelpers.js'
import { writeAuditLog } from './auditService.js'
import type { CreateScheduleData, MealScheduleItem, UpcomingSchedulesItem } from '../types/index.js'

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
      PK:                    `SCHEDULE#${data.date}`,
      SK:                    'METADATA',
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

  // Maintain UPCOMING_SCHEDULES sentinel
  await dynamo.send(new UpdateCommand({
    TableName:                 TABLES.MAIN,
    Key:                       { PK: 'SYSTEM', SK: 'UPCOMING_SCHEDULES' },
    UpdateExpression:          'ADD scheduleDates :d SET updatedAt = :now',
    ExpressionAttributeValues: { ':d': new Set([data.date]), ':now': now },
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

  // Get all published dates from UPCOMING_SCHEDULES sentinel
  const sentinelResult = await dynamo.send(new GetCommand({
    TableName: TABLES.MAIN,
    Key: { PK: 'SYSTEM', SK: 'UPCOMING_SCHEDULES' },
  }))
  const sentinel = sentinelResult.Item as UpcomingSchedulesItem | undefined
  if (!sentinel?.scheduleDates?.size) return []

  // BatchGet all schedule items, filter to upcoming dates in application
  const dates = [...sentinel.scheduleDates]
  const batchResult = await dynamo.send(new BatchGetCommand({
    RequestItems: {
      [TABLES.MAIN]: {
        Keys: dates.map(d => ({ PK: `SCHEDULE#${d}`, SK: 'METADATA' })),
      },
    },
  }))

  return ((batchResult.Responses?.[TABLES.MAIN] ?? []) as MealScheduleItem[])
    .filter(s => s.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date))
}

export async function deleteMealSchedule(date: string): Promise<void> {
  const now = new Date().toISOString()

  await dynamo.send(new DeleteCommand({
    TableName: TABLES.MAIN,
    Key: { PK: `SCHEDULE#${date}`, SK: 'METADATA' },
  }))

  // Remove from UPCOMING_SCHEDULES sentinel
  await dynamo.send(new UpdateCommand({
    TableName:                 TABLES.MAIN,
    Key:                       { PK: 'SYSTEM', SK: 'UPCOMING_SCHEDULES' },
    UpdateExpression:          'DELETE scheduleDates :d SET updatedAt = :now',
    ExpressionAttributeValues: { ':d': new Set([date]), ':now': now },
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

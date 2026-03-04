import { PutCommand, DeleteCommand, ScanCommand } from '@aws-sdk/lib-dynamodb'
import { dynamo, TABLES } from '../config/dynamoClient.js'
import { getTodayString } from '../utils/dateHelpers.js'
import type { CreateScheduleData, MealScheduleItem } from '../types/index.js'

// ── Meal Schedule ─────────────────────────────────────────────────────────────

export async function createMealSchedule(
  data: CreateScheduleData,
  createdBy: string,
): Promise<void> {
  const now = new Date().toISOString()
  await dynamo.send(new PutCommand({
    TableName: TABLES.SCHEDULES,
    Item: {
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
}

export async function getAllMealSchedules(): Promise<MealScheduleItem[]> {
  const today = getTodayString()

  // Scan is acceptable here — mealSchedules holds at most ~30 items at any time
  const result = await dynamo.send(new ScanCommand({
    TableName:                 TABLES.SCHEDULES,
    FilterExpression:          '#d >= :today',
    ExpressionAttributeNames:  { '#d': 'date' },  // 'date' is a DynamoDB reserved word
    ExpressionAttributeValues: { ':today': today },
  }))

  return ((result.Items ?? []) as MealScheduleItem[])
    .sort((a, b) => a.date.localeCompare(b.date))
}

export async function deleteMealSchedule(date: string): Promise<void> {
  await dynamo.send(new DeleteCommand({
    TableName: TABLES.SCHEDULES,
    Key: { date },
  }))
}

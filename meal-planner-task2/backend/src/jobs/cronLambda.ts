import 'dotenv/config'
import { QueryCommand, BatchGetCommand, BatchWriteCommand, UpdateCommand, GetCommand } from '@aws-sdk/lib-dynamodb'
import { dynamo, TABLES } from '../config/dynamoClient.js'
import {
  getTomorrowString,
  isWeekend,
} from '../utils/dateHelpers.js'
import { writeAuditLog } from '../services/auditService.js'
import type { UserItem, MealRecordItem, MealScheduleItem } from '../types/index.js'

const DEFAULT_SCHEDULE = {
  lunchEnabled:          true,
  snacksEnabled:         true,
  iftarEnabled:          false,
  eventDinnerEnabled:    false,
  optionalDinnerEnabled: false,
}

// ── Entry point ───────────────────────────────────────────────────────────────

export const handler = async (event: { type?: string }): Promise<void> => {
  // Belt-and-suspenders: skip if somehow triggered on a weekend
  const today = new Date()
  const dow   = today.getUTCDay()
  if (dow === 0 || dow === 6) {
    console.log('Weekend — skipping cron.')
    return
  }

  switch (event.type) {
    case 'CREATE_RECORDS': return createRecords()
    case 'SEND_REPORT':    return sendHeadcountReport()
    default:
      console.error(`Unknown cron event type: ${event.type}`)
  }
}

// ── CREATE_RECORDS ────────────────────────────────────────────────────────────

/**
 * Creates a MealRecord for every active user for tomorrow.
 * Runs nightly on weekdays so employees see tomorrow's row on /my-schedule.
 */
async function createRecords(): Promise<void> {
  const date = getTomorrowString()

  if (isWeekend(date)) {
    console.log(`Tomorrow (${date}) is a weekend — skipping record creation.`)
    return
  }

  // 1. Fetch schedule for tomorrow (fall back to defaults if none published)
  const scheduleResult = await dynamo.send(new GetCommand({
    TableName: TABLES.MAIN,
    Key: { PK: 'SCHEDULE', SK: date },
  }))
  const schedule = (scheduleResult.Item as MealScheduleItem | undefined) ?? DEFAULT_SCHEDULE

  const defaults = {
    lunch:          schedule.lunchEnabled          ? true : null,
    snacks:         schedule.snacksEnabled         ? true : null,
    iftar:          schedule.iftarEnabled          ? true : null,
    eventDinner:    schedule.eventDinnerEnabled    ? true : null,
    optionalDinner: schedule.optionalDinnerEnabled ? true : null,
  }

  // 2. Get all active users
  const gsiResult = await dynamo.send(new QueryCommand({
    TableName:                 TABLES.MAIN,
    IndexName:                 'status-email-index',
    KeyConditionExpression:    '#status = :active',
    ExpressionAttributeNames:  { '#status': 'status' },
    ExpressionAttributeValues: { ':active': 'ACTIVE' },
  }))
  const activeUsers = (gsiResult.Items ?? []) as UserItem[]
  if (!activeUsers.length) {
    console.log('No active users found.')
    return
  }

  const discordIds = activeUsers.map(u => u.discordId)
  console.log(`Processing ${discordIds.length} users for ${date}`)

  // 3. BatchGet existing records to avoid overwriting confirmed choices
  const existingRecords: MealRecordItem[] = []
  for (const chunk of chunkArray(discordIds, 100)) {
    const batchResult = await dynamo.send(new BatchGetCommand({
      RequestItems: {
        [TABLES.MAIN]: {
          Keys: chunk.map(id => ({ PK: `USER#${id}`, SK: `RECORD#${date}` })),
        },
      },
    }))
    existingRecords.push(...((batchResult.Responses?.[TABLES.MAIN] ?? []) as MealRecordItem[]))
  }

  const existingByUser = new Map(existingRecords.map(r => [r.discordId, r]))
  const userMap        = new Map(activeUsers.map(u => [u.discordId, u]))

  const noRecord  = discordIds.filter(id => !existingByUser.has(id))
  const hasRecord = discordIds.filter(id =>  existingByUser.has(id))

  const now = new Date().toISOString()

  // 4. Create new records for users who have none
  if (noRecord.length) {
    for (const chunk of chunkArray(noRecord, 25)) {
      await dynamo.send(new BatchWriteCommand({
        RequestItems: {
          [TABLES.MAIN]: chunk.map(discordId => {
            const user = userMap.get(discordId)
            return {
              PutRequest: {
                Item: {
                  PK:             `USER#${discordId}`,
                  SK:             `RECORD#${date}`,
                  discordId,
                  date,
                  ...defaults,
                  workFromHome:   false,
                  teamId:         user?.teamId,
                  teamName:       user?.teamName,
                  createdAt:      now,
                  updatedAt:      now,
                } satisfies MealRecordItem,
              },
            }
          }),
        },
      }))
    }
    console.log(`Created ${noRecord.length} new records.`)
  }

  // 5. For existing records, fill only null meal fields with schedule defaults
  let filledCount = 0
  for (const discordId of hasRecord) {
    const record  = existingByUser.get(discordId)!
    const updates: string[] = []
    const values: Record<string, unknown> = { ':now': now }

    const mealFields = [
      { field: 'lunch',          key: ':lunch',   val: defaults.lunch },
      { field: 'snacks',         key: ':snacks',  val: defaults.snacks },
      { field: 'iftar',          key: ':iftar',   val: defaults.iftar },
      { field: 'eventDinner',    key: ':ed',      val: defaults.eventDinner },
      { field: 'optionalDinner', key: ':od',      val: defaults.optionalDinner },
    ] as const

    for (const { field, key, val } of mealFields) {
      if (record[field] === null && val !== null) {
        updates.push(`${field} = ${key}`)
        values[key] = val
      }
    }

    if (updates.length) {
      await dynamo.send(new UpdateCommand({
        TableName:                 TABLES.MAIN,
        Key:                       { PK: `USER#${discordId}`, SK: `RECORD#${date}` },
        UpdateExpression:          `SET ${updates.join(', ')}, updatedAt = :now`,
        ExpressionAttributeValues: values,
      }))
      filledCount++
    }
  }

  if (filledCount) console.log(`Filled null fields in ${filledCount} existing records.`)

  const total = noRecord.length + filledCount
  console.log(`Done. ${total} records written for ${date}.`)

  await writeAuditLog({
    actorDiscordId: 'SYSTEM',
    actorName:      'SYSTEM',
    action:         'CREATE',
    entityType:     'MEAL_RECORD',
    entityId:       date,
    metadata:       { created: noRecord.length, filled: filledCount, date },
  })
}

// ── SEND_REPORT ───────────────────────────────────────────────────────────────

/**
 * Fetches today's meal records for all active users, aggregates headcount,
 * and posts a report to the configured Discord channel.
 */
async function sendHeadcountReport(): Promise<void> {
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL
  if (!webhookUrl) {
    console.error('DISCORD_WEBHOOK_URL not set — skipping report.')
    return
  }

  // Today's date string
  const today = new Date()
  const date  = today.toISOString().slice(0, 10)

  // Get all active users via GSI
  const gsiResult = await dynamo.send(new QueryCommand({
    TableName:                 TABLES.MAIN,
    IndexName:                 'status-email-index',
    KeyConditionExpression:    '#status = :active',
    ExpressionAttributeNames:  { '#status': 'status' },
    ExpressionAttributeValues: { ':active': 'ACTIVE' },
  }))
  const activeUsers = (gsiResult.Items ?? []) as UserItem[]
  if (!activeUsers.length) {
    console.log('No active users — skipping report.')
    return
  }

  const discordIds = activeUsers.map(u => u.discordId)

  // BatchGet today's meal records for all active users (chunks of 100)
  const records: MealRecordItem[] = []
  const chunks = chunkArray(discordIds, 100)

  for (const chunk of chunks) {
    const batchResult = await dynamo.send(new BatchGetCommand({
      RequestItems: {
        [TABLES.MAIN]: {
          Keys: chunk.map(id => ({ PK: `USER#${id}`, SK: `RECORD#${date}` })),
        },
      },
    }))
    records.push(...((batchResult.Responses?.[TABLES.MAIN] ?? []) as MealRecordItem[]))
  }

  // Aggregate counts
  const office = records.filter(r => !r.workFromHome).length
  const wfh    = records.filter(r => r.workFromHome).length
  const lunch          = records.filter(r => r.lunch === true).length
  const snacks         = records.filter(r => r.snacks === true).length
  const iftar          = records.filter(r => r.iftar === true).length
  const eventDinner    = records.filter(r => r.eventDinner === true).length
  const optionalDinner = records.filter(r => r.optionalDinner === true).length

  // Team breakdown
  const teamMap = new Map<string, { name: string; lunch: number; snacks: number }>()
  for (const r of records) {
    if (!r.teamId) continue
    const entry = teamMap.get(r.teamId) ?? { name: r.teamName ?? r.teamId, lunch: 0, snacks: 0 }
    if (r.lunch  === true) entry.lunch++
    if (r.snacks === true) entry.snacks++
    teamMap.set(r.teamId, entry)
  }

  const teamLines = [...teamMap.values()]
    .map(t => `  ${t.name}: Lunch ${t.lunch} | Snacks ${t.snacks}`)
    .join('\n')

  const message = [
    `📊 **Daily Headcount — ${date}**`,
    ``,
    `🏢 Office: **${office}** | 🏠 WFH: **${wfh}**`,
    ``,
    `**Meal Counts:**`,
    `🍱 Lunch: ${lunch}  🍪 Snacks: ${snacks}  🌙 Iftar: ${iftar}  🍽️ Event Dinner: ${eventDinner}  🥘 Optional Dinner: ${optionalDinner}`,
    teamLines ? `\n**By Team:**\n${teamLines}` : '',
  ].filter(Boolean).join('\n')

  // Post to Discord via webhook
  const response = await fetch(webhookUrl, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ content: message }),
  })

  if (!response.ok) {
    const body = await response.text()
    console.error(`Failed to post headcount report: ${response.status} ${body}`)
  } else {
    console.log('Headcount report posted successfully.')
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function chunkArray<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = []
  for (let i = 0; i < arr.length; i += size) chunks.push(arr.slice(i, i + size))
  return chunks
}

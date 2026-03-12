import 'dotenv/config'
import { GetCommand, BatchGetCommand, BatchWriteCommand } from '@aws-sdk/lib-dynamodb'
import { dynamo, TABLES } from '../config/dynamoClient.js'
import {
  getTomorrowString,
  isWeekend,
} from '../utils/dateHelpers.js'
import { writeAuditLog } from '../services/auditService.js'
import type { ActiveUsersItem, MealRecordItem } from '../types/index.js'

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

  // Get all active user Discord IDs from sentinel
  const sentinelResult = await dynamo.send(new GetCommand({
    TableName: TABLES.MAIN,
    Key: { PK: 'SYSTEM', SK: 'ACTIVE_USERS' },
  }))
  const sentinel = sentinelResult.Item as ActiveUsersItem | undefined
  if (!sentinel?.memberIds?.size) {
    console.log('No active users found.')
    return
  }

  const discordIds = [...sentinel.memberIds]
  console.log(`Creating records for ${discordIds.length} users on ${date}`)

  // BatchWrite in chunks of 25 (DynamoDB limit)
  const now = new Date().toISOString()
  const chunks = chunkArray(discordIds, 25)

  for (const chunk of chunks) {
    await dynamo.send(new BatchWriteCommand({
      RequestItems: {
        [TABLES.MAIN]: chunk.map(discordId => ({
          PutRequest: {
            Item: {
              PK:             `USER#${discordId}`,
              SK:             `RECORD#${date}`,
              discordId,
              date,
              lunch:          null,
              snacks:         null,
              iftar:          null,
              eventDinner:    null,
              optionalDinner: null,
              workFromHome:   false,
              createdAt:      now,
              updatedAt:      now,
            } satisfies Omit<MealRecordItem, 'teamId' | 'teamName'>,
          },
        })),
      },
    }))
  }

  console.log(`Done. ${discordIds.length} records created for ${date}.`)

  await writeAuditLog({
    actorDiscordId: 'SYSTEM',
    actorName:      'SYSTEM',
    action:         'CREATE',
    entityType:     'MEAL_RECORD',
    entityId:       date,
    metadata:       { count: discordIds.length },
  })
}

// ── SEND_REPORT ───────────────────────────────────────────────────────────────

/**
 * Fetches today's meal records for all active users, aggregates headcount,
 * and posts a report to the configured Discord channel.
 */
async function sendHeadcountReport(): Promise<void> {
  const webhookUrl = process.env.HEADCOUNT_WEBHOOK_URL
  if (!webhookUrl) {
    console.error('HEADCOUNT_WEBHOOK_URL not set — skipping report.')
    return
  }

  // Today's date string
  const today = new Date()
  const date  = today.toISOString().slice(0, 10)

  // Get all active user Discord IDs
  const sentinelResult = await dynamo.send(new GetCommand({
    TableName: TABLES.MAIN,
    Key: { PK: 'SYSTEM', SK: 'ACTIVE_USERS' },
  }))
  const sentinel = sentinelResult.Item as ActiveUsersItem | undefined
  if (!sentinel?.memberIds?.size) {
    console.log('No active users — skipping report.')
    return
  }

  const discordIds = [...sentinel.memberIds]

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

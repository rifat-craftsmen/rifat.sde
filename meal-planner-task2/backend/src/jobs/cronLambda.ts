import 'dotenv/config'
import { QueryCommand, BatchGetCommand, BatchWriteCommand, UpdateCommand, GetCommand } from '@aws-sdk/lib-dynamodb'
import { dynamo, TABLES } from '../config/dynamoClient.js'
import {
  getTodayString,
  getTomorrowString,
  isWeekend,
  isDateInPeriod,
  getCurrentMonthKey,
} from '../utils/dateHelpers.js'
import { writeAuditLog } from '../services/auditService.js'
import { getHeadcount, formatHeadcountMessage } from '../services/headcountService.js'
import type { UserItem, MealRecordItem, MealScheduleItem, WfhPeriodItem } from '../types/index.js'

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

  // Check if tomorrow falls within a company-wide WFH period
  const wfhPeriodsResult = await dynamo.send(new QueryCommand({
    TableName:                 TABLES.MAIN,
    KeyConditionExpression:    'PK = :pk',
    ExpressionAttributeValues: { ':pk': 'WFHPERIOD' },
  }))
  const wfhPeriods  = (wfhPeriodsResult.Items ?? []) as WfhPeriodItem[]
  const isGlobalWFH = wfhPeriods.some(p => isDateInPeriod(date, p.dateFrom, p.dateTo))

  if (isGlobalWFH) console.log(`Global WFH period active for ${date} — all meals disabled, WFH = true.`)

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
                  lunch:          isGlobalWFH ? false : defaults.lunch,
                  snacks:         isGlobalWFH ? false : defaults.snacks,
                  iftar:          isGlobalWFH ? false : defaults.iftar,
                  eventDinner:    isGlobalWFH ? false : defaults.eventDinner,
                  optionalDinner: isGlobalWFH ? false : defaults.optionalDinner,
                  workFromHome:   isGlobalWFH ? true  : false,
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

  // 5. For existing records:
  //    - Global WFH day: override all meals → false, workFromHome → true
  //    - Normal day: fill only null meal fields with schedule defaults
  let filledCount = 0
  for (const discordId of hasRecord) {
    const record = existingByUser.get(discordId)!

    if (isGlobalWFH) {
      await dynamo.send(new UpdateCommand({
        TableName:                 TABLES.MAIN,
        Key:                       { PK: `USER#${discordId}`, SK: `RECORD#${date}` },
        UpdateExpression:          'SET lunch = :f, snacks = :f, iftar = :f, eventDinner = :f, optionalDinner = :f, workFromHome = :t, updatedAt = :now',
        ExpressionAttributeValues: { ':f': false, ':t': true, ':now': now },
      }))
      filledCount++
    } else {
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
  }

  if (isGlobalWFH && filledCount) console.log(`Overrode ${filledCount} existing records for global WFH day.`)
  else if (filledCount)           console.log(`Filled null fields in ${filledCount} existing records.`)


  const total = noRecord.length + filledCount
  console.log(`Done. ${total} records written for ${date}.`)

  await postWebhook(
    `🌙 **Nightly records created — ${date}**\n` +
    `✔ New: **${noRecord.length}**  📝 Filled: **${filledCount}**  👥 Total active users: **${discordIds.length}**`
  )

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
  const date = getTodayString()
  const data = await getHeadcount(date)

  const content = formatHeadcountMessage(data)
  if (!content) {
    console.log(`No meal records found for ${date} — skipping report.`)
    return
  }

  await postWebhook(content)
  console.log('Headcount report posted successfully.')
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function chunkArray<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = []
  for (let i = 0; i < arr.length; i += size) chunks.push(arr.slice(i, i + size))
  return chunks
}

async function postWebhook(content: string): Promise<void> {
  const posts: Promise<void>[] = []

  const discordUrl = process.env.DISCORD_WEBHOOK_URL
  if (discordUrl) {
    posts.push(
      fetch(discordUrl, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ content }),
      }).then(async r => {
        if (!r.ok) console.error(`Discord webhook failed: ${r.status} ${await r.text()}`)
      })
    )
  } else {
    console.warn('DISCORD_WEBHOOK_URL not set — skipping Discord post.')
  }

  const googleUrl = process.env.GOOGLE_CHAT_WEBHOOK_URL
  if (googleUrl) {
    posts.push(
      fetch(googleUrl, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ text: content }),
      }).then(async r => {
        if (!r.ok) console.error(`Google Chat webhook failed: ${r.status} ${await r.text()}`)
      })
    )
  } else {
    console.warn('GOOGLE_CHAT_WEBHOOK_URL not set — skipping Google Chat post.')
  }

  await Promise.all(posts)
}

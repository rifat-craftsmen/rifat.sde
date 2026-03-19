import { QueryCommand, BatchGetCommand, GetCommand } from '@aws-sdk/lib-dynamodb'
import { dynamo, TABLES } from '../config/dynamoClient.js'
import type { UserItem, MealRecordItem, MealScheduleItem, HeadcountData } from '../types/index.js'

function chunkArray<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = []
  for (let i = 0; i < arr.length; i += size) chunks.push(arr.slice(i, i + size))
  return chunks
}

export async function getHeadcount(date: string): Promise<HeadcountData> {
  // 1. All active users via GSI
  const gsiResult = await dynamo.send(new QueryCommand({
    TableName:                 TABLES.MAIN,
    IndexName:                 'status-email-index',
    KeyConditionExpression:    '#status = :active',
    ExpressionAttributeNames:  { '#status': 'status' },
    ExpressionAttributeValues: { ':active': 'ACTIVE' },
  }))
  const activeUsers = (gsiResult.Items ?? []) as UserItem[]
  const discordIds  = activeUsers.map(u => u.discordId)

  // 2. BatchGet meal records for the date (chunks of 100)
  const records: MealRecordItem[] = []
  for (const chunk of chunkArray(discordIds, 100)) {
    const batch = await dynamo.send(new BatchGetCommand({
      RequestItems: {
        [TABLES.MAIN]: {
          Keys: chunk.map(id => ({ PK: `USER#${id}`, SK: `RECORD#${date}` })),
        },
      },
    }))
    records.push(...((batch.Responses?.[TABLES.MAIN] ?? []) as MealRecordItem[]))
  }

  // 3. Fetch schedule for occasionName
  const scheduleResult = await dynamo.send(new GetCommand({
    TableName: TABLES.MAIN,
    Key: { PK: 'SCHEDULE', SK: date },
  }))
  const schedule = scheduleResult.Item as MealScheduleItem | undefined

  // 4. Aggregate meal totals
  const mealTotals = {
    lunch:          records.filter(r => r.lunch === true).length,
    snacks:         records.filter(r => r.snacks === true).length,
    iftar:          records.filter(r => r.iftar === true).length,
    eventDinner:    records.filter(r => r.eventDinner === true).length,
    optionalDinner: records.filter(r => r.optionalDinner === true).length,
  }

  // 5. Work location split
  const workLocationSplit = {
    office: records.filter(r => !r.workFromHome).length,
    wfh:    records.filter(r =>  r.workFromHome).length,
  }

  // 6. Team breakdown
  const teamMap = new Map<string, {
    teamName:       string
    totalMembers:   number
    lunch:          number
    snacks:         number
    iftar:          number
    eventDinner:    number
    optionalDinner: number
  }>()

  for (const r of records) {
    const tid = r.teamId ?? '__none__'
    const entry = teamMap.get(tid) ?? {
      teamName:       r.teamName ?? tid,
      totalMembers:   0,
      lunch:          0,
      snacks:         0,
      iftar:          0,
      eventDinner:    0,
      optionalDinner: 0,
    }
    entry.totalMembers++
    if (r.lunch          === true) entry.lunch++
    if (r.snacks         === true) entry.snacks++
    if (r.iftar          === true) entry.iftar++
    if (r.eventDinner    === true) entry.eventDinner++
    if (r.optionalDinner === true) entry.optionalDinner++
    teamMap.set(tid, entry)
  }

  const teamBreakdown = [...teamMap.entries()]
    .filter(([tid]) => tid !== '__none__')
    .map(([teamId, t]) => ({ teamId, ...t }))
    .sort((a, b) => a.teamName.localeCompare(b.teamName))

  return {
    date,
    mealTotals,
    teamBreakdown,
    workLocationSplit,
    overallTotal:  records.length,
    occasionName:  schedule?.occasionName ?? null,
  }
}

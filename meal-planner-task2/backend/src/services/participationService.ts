import { QueryCommand, BatchGetCommand, GetCommand } from '@aws-sdk/lib-dynamodb'
import { dynamo, TABLES } from '../config/dynamoClient.js'
import type { UserItem, MealRecordItem, TeamItem, DailyParticipationData } from '../types/index.js'

function chunkArray<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = []
  for (let i = 0; i < arr.length; i += size) chunks.push(arr.slice(i, i + size))
  return chunks
}

async function batchGetProfiles(discordIds: string[]): Promise<UserItem[]> {
  const profiles: UserItem[] = []
  for (const chunk of chunkArray(discordIds, 100)) {
    const result = await dynamo.send(new BatchGetCommand({
      RequestItems: {
        [TABLES.MAIN]: {
          Keys: chunk.map(id => ({ PK: `USER#${id}`, SK: 'PROFILE' })),
        },
      },
    }))
    profiles.push(...((result.Responses?.[TABLES.MAIN] ?? []) as UserItem[]))
  }
  return profiles
}

async function batchGetRecords(discordIds: string[], date: string): Promise<MealRecordItem[]> {
  const records: MealRecordItem[] = []
  for (const chunk of chunkArray(discordIds, 100)) {
    const result = await dynamo.send(new BatchGetCommand({
      RequestItems: {
        [TABLES.MAIN]: {
          Keys: chunk.map(id => ({ PK: `USER#${id}`, SK: `RECORD#${date}` })),
        },
      },
    }))
    records.push(...((result.Responses?.[TABLES.MAIN] ?? []) as MealRecordItem[]))
  }
  return records
}

/**
 * Returns per-employee participation for a date.
 * - teamId provided → scoped to that team's members (LEAD view)
 * - teamId omitted  → all active users (ADMIN view)
 */
export async function getParticipation(
  date:    string,
  teamId?: string,
): Promise<DailyParticipationData> {
  let discordIds: string[]

  if (teamId) {
    // LEAD path: get member list from team item
    const teamResult = await dynamo.send(new GetCommand({
      TableName: TABLES.MAIN,
      Key: { PK: 'TEAM', SK: teamId },
    }))
    const team = teamResult.Item as TeamItem | undefined
    discordIds = team?.memberIds ? [...team.memberIds] : []
  } else {
    // ADMIN path: all active users via GSI
    const gsiResult = await dynamo.send(new QueryCommand({
      TableName:                 TABLES.MAIN,
      IndexName:                 'status-email-index',
      KeyConditionExpression:    '#status = :active',
      ExpressionAttributeNames:  { '#status': 'status' },
      ExpressionAttributeValues: { ':active': 'ACTIVE' },
    }))
    discordIds = ((gsiResult.Items ?? []) as UserItem[]).map(u => u.discordId)
  }

  if (!discordIds.length) {
    return { date, employees: [] }
  }

  const [profiles, records] = await Promise.all([
    batchGetProfiles(discordIds),
    batchGetRecords(discordIds, date),
  ])

  const profileMap = new Map(profiles.map(p => [p.discordId, p]))
  const recordMap  = new Map(records.map(r => [r.discordId, r]))

  const employees = discordIds
    .map(id => {
      const profile = profileMap.get(id)
      const record  = recordMap.get(id)
      if (!profile) return null
      return {
        discordId:    id,
        name:         profile.name,
        teamName:     profile.teamName ?? null,
        workFromHome: record?.workFromHome ?? false,
        wfhCount:     profile.wfhCount,
        meals: {
          lunch:          record?.lunch          ?? null,
          snacks:         record?.snacks         ?? null,
          iftar:          record?.iftar          ?? null,
          eventDinner:    record?.eventDinner    ?? null,
          optionalDinner: record?.optionalDinner ?? null,
        },
      }
    })
    .filter((e): e is NonNullable<typeof e> => e !== null)
    .sort((a, b) => (a.teamName ?? '').localeCompare(b.teamName ?? '') || a.name.localeCompare(b.name))

  return { date, employees }
}

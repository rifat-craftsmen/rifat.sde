import { GetCommand, BatchGetCommand, QueryCommand } from '@aws-sdk/lib-dynamodb'
import { dynamo, TABLES } from '../config/dynamoClient.js'
import type { TeamItem, UserItem } from '../types/index.js'

export interface TeamMemberView {
  discordId: string
  name:      string
  status:    string
  wfhCount:  number
  wfhMonth:  string
  teamName:  string
}

/**
 * Returns the team item and a roster of member profiles for a given teamId.
 * Throws if the team does not exist or has no members.
 */
export async function getTeamMembers(teamId: string): Promise<{
  teamName: string
  members:  TeamMemberView[]
}> {
  const teamResult = await dynamo.send(new GetCommand({
    TableName: TABLES.MAIN,
    Key: { PK: 'TEAM', SK: teamId },
  }))

  const team = teamResult.Item as TeamItem | undefined
  if (!team) throw new Error(`Team not found: ${teamId}`)

  const memberIds = team.memberIds ? [...team.memberIds] : []
  if (!memberIds.length) return { teamName: team.name, members: [] }

  const chunks: string[][] = []
  for (let i = 0; i < memberIds.length; i += 100) chunks.push(memberIds.slice(i, i + 100))

  const profiles: UserItem[] = []
  for (const chunk of chunks) {
    const result = await dynamo.send(new BatchGetCommand({
      RequestItems: {
        [TABLES.MAIN]: {
          Keys: chunk.map(id => ({ PK: `USER#${id}`, SK: 'PROFILE' })),
        },
      },
    }))
    profiles.push(...((result.Responses?.[TABLES.MAIN] ?? []) as UserItem[]))
  }

  const members: TeamMemberView[] = profiles
    .map(p => ({
      discordId: p.discordId,
      name:      p.name,
      status:    p.status,
      wfhCount:  p.wfhCount,
      wfhMonth:  p.wfhMonth,
      teamName:  team.name,
    }))
    .sort((a, b) => a.name.localeCompare(b.name))

  return { teamName: team.name, members }
}

/**
 * Returns all active users for ADMIN view, sorted by teamName then name.
 */
export async function getAllActiveMembers(): Promise<TeamMemberView[]> {
  const gsiResult = await dynamo.send(new QueryCommand({
    TableName:                 TABLES.MAIN,
    IndexName:                 'status-email-index',
    KeyConditionExpression:    '#status = :active',
    ExpressionAttributeNames:  { '#status': 'status' },
    ExpressionAttributeValues: { ':active': 'ACTIVE' },
  }))

  const profiles = (gsiResult.Items ?? []) as UserItem[]

  return profiles
    .map(p => ({
      discordId: p.discordId,
      name:      p.name,
      status:    p.status,
      wfhCount:  p.wfhCount,
      wfhMonth:  p.wfhMonth,
      teamName:  p.teamName ?? '—',
    }))
    .sort((a, b) => a.teamName.localeCompare(b.teamName) || a.name.localeCompare(b.name))
}

/**
 * Looks up a user profile by email via the status-email-index GSI.
 * Returns the profile or undefined if not found.
 */
export async function getUserByEmail(email: string): Promise<UserItem | undefined> {
  const result = await dynamo.send(new QueryCommand({
    TableName:                 TABLES.MAIN,
    IndexName:                 'status-email-index',
    KeyConditionExpression:    '#status = :active AND email = :email',
    ExpressionAttributeNames:  { '#status': 'status' },
    ExpressionAttributeValues: { ':active': 'ACTIVE', ':email': email },
    Limit: 1,
  }))
  return (result.Items?.[0]) as UserItem | undefined
}

/**
 * Verifies that targetDiscordId is a member of the given team.
 * Returns true if the member belongs to the team.
 */
export async function isTeamMember(teamId: string, targetDiscordId: string): Promise<boolean> {
  const teamResult = await dynamo.send(new GetCommand({
    TableName: TABLES.MAIN,
    Key: { PK: 'TEAM', SK: teamId },
  }))
  const team = teamResult.Item as TeamItem | undefined
  return !!(team?.memberIds?.has(targetDiscordId))
}

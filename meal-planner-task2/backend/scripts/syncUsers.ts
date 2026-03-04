import 'dotenv/config'
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parse } from 'yaml'
import { PutCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb'
import { dynamo, TABLES } from '../src/config/dynamoClient.js'
import type { Role, UserStatus } from '../src/types/index.js'

const __dirname = dirname(fileURLToPath(import.meta.url))

interface UserYaml {
  userId:    string
  discordId: string
  name:      string
  email:     string
  role:      Role
  status:    UserStatus
  teamId:    string | null
}

interface TeamYaml {
  teamId: string
  name:   string
  leadId: string
}

function loadUsers(): UserYaml[] {
  const file = readFileSync(join(__dirname, 'data/users.yaml'), 'utf8')
  return parse(file) as UserYaml[]
}

function loadTeams(): TeamYaml[] {
  const file = readFileSync(join(__dirname, 'data/teams.yaml'), 'utf8')
  return parse(file) as TeamYaml[]
}

function getCurrentMonthKey(): string {
  return new Date().toISOString().slice(0, 7) // YYYY-MM
}

async function syncUsers() {
  const users   = loadUsers()
  const teams   = loadTeams()
  const teamMap = new Map(teams.map(t => [t.teamId, t.name]))

  console.log(`\nSyncing ${users.length} user(s) → ${TABLES.MAIN}\n`)

  const now          = new Date().toISOString()
  const wfhMonth     = getCurrentMonthKey()
  const activeIds: string[] = []

  for (const user of users) {
    const teamName = user.teamId ? (teamMap.get(user.teamId) ?? undefined) : undefined

    // ── Upsert user PROFILE ────────────────────────────────────────────────
    await dynamo.send(new PutCommand({
      TableName: TABLES.MAIN,
      Item: {
        PK:        `USER#${user.userId}`,
        SK:        'PROFILE',
        userId:    user.userId,
        name:      user.name,
        email:     user.email,
        discordId: user.discordId,
        role:      user.role,
        status:    user.status,
        teamId:    user.teamId   ?? undefined,
        teamName:  teamName      ?? undefined,
        wfhCount:  0,
        wfhMonth,
        gsi1pk:    user.discordId,  // discordId-index
        createdAt: now,
        updatedAt: now,
      },
    }))

    console.log(`  ✓ ${user.userId}  ${user.name.padEnd(20)} [${user.role}] [${user.status}]`)

    // ── Sync team membership ───────────────────────────────────────────────
    if (user.teamId) {
      if (user.status === 'ACTIVE') {
        await dynamo.send(new UpdateCommand({
          TableName:                 TABLES.TEAMS,
          Key:                       { teamId: user.teamId },
          UpdateExpression:          'ADD memberIds :uid',
          ExpressionAttributeValues: { ':uid': new Set([user.userId]) },
        }))
      } else {
        // Remove inactive users from team so headcounts stay accurate
        await dynamo.send(new UpdateCommand({
          TableName:                 TABLES.TEAMS,
          Key:                       { teamId: user.teamId },
          UpdateExpression:          'DELETE memberIds :uid',
          ExpressionAttributeValues: { ':uid': new Set([user.userId]) },
        }))
      }
    }

    if (user.status === 'ACTIVE') activeIds.push(user.userId)
  }

  // ── Upsert SYSTEM/ACTIVE_USERS sentinel ───────────────────────────────────
  // Used by the cron Lambda to get all active users without a table scan
  if (activeIds.length > 0) {
    await dynamo.send(new PutCommand({
      TableName: TABLES.MAIN,
      Item: {
        PK:        'SYSTEM',
        SK:        'ACTIVE_USERS',
        memberIds: new Set(activeIds),
      },
    }))
    console.log(`\n  ✓ SYSTEM/ACTIVE_USERS updated  (${activeIds.length} active users)`)
  }

  console.log('\nDone.\n')
}

syncUsers().catch(err => { console.error(err); process.exit(1) })

import 'dotenv/config'
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parse } from 'yaml'
import { UpdateCommand } from '@aws-sdk/lib-dynamodb'
import { dynamo, TABLES } from '../src/config/dynamoClient.js'
import type { Role, UserStatus } from '../src/types/index.js'

const __dirname = dirname(fileURLToPath(import.meta.url))

interface UserYaml {
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

  const now      = new Date().toISOString()
  const wfhMonth = getCurrentMonthKey()

  for (const user of users) {
    const teamName = user.teamId ? (teamMap.get(user.teamId) ?? undefined) : undefined

    // ── Upsert UserProfile ─────────────────────────────────────────────────
    // Always update mutable fields (name, email, role, status, team).
    // wfhCount/wfhMonth and createdAt use if_not_exists to preserve existing values on re-sync.
    await dynamo.send(new UpdateCommand({
      TableName:                 TABLES.MAIN,
      Key:                       { PK: `USER#${user.discordId}`, SK: 'PROFILE' },
      UpdateExpression:          'SET discordId = :discordId, #name = :name, email = :email, #role = :role, #status = :status, teamId = :teamId, teamName = :teamName, updatedAt = :now, wfhCount = if_not_exists(wfhCount, :zero), wfhMonth = if_not_exists(wfhMonth, :wfhMonth), createdAt = if_not_exists(createdAt, :now)',
      ExpressionAttributeNames:  { '#name': 'name', '#role': 'role', '#status': 'status' },
      ExpressionAttributeValues: {
        ':discordId': user.discordId,
        ':name':      user.name,
        ':email':     user.email,
        ':role':      user.role,
        ':status':    user.status,
        ':teamId':    user.teamId  ?? null,
        ':teamName':  teamName     ?? null,
        ':zero':      0,
        ':wfhMonth':  wfhMonth,
        ':now':       now,
      },
    }))

    console.log(`  ✓ ${user.discordId}  ${user.name.padEnd(20)} [${user.role}] [${user.status}]`)

    // ── Sync team membership (discordId-based StringSet) ───────────────────
    if (user.teamId) {
      if (user.status === 'ACTIVE') {
        await dynamo.send(new UpdateCommand({
          TableName:                 TABLES.MAIN,
          Key:                       { PK: 'TEAM', SK: user.teamId },
          UpdateExpression:          'ADD memberIds :did',
          ExpressionAttributeValues: { ':did': new Set([user.discordId]) },
        }))
      } else {
        await dynamo.send(new UpdateCommand({
          TableName:                 TABLES.MAIN,
          Key:                       { PK: 'TEAM', SK: user.teamId },
          UpdateExpression:          'DELETE memberIds :did',
          ExpressionAttributeValues: { ':did': new Set([user.discordId]) },
        }))
      }
    }

  }

  console.log('\nDone.\n')
}

syncUsers().catch(err => { console.error(err); process.exit(1) })

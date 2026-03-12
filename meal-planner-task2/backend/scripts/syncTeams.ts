import 'dotenv/config'
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parse } from 'yaml'
import { PutCommand } from '@aws-sdk/lib-dynamodb'
import { dynamo, TABLES } from '../src/config/dynamoClient.js'

const __dirname = dirname(fileURLToPath(import.meta.url))

interface TeamYaml {
  teamId: string
  name:   string
  leadId: string  // discordId of team lead
}

function loadTeams(): TeamYaml[] {
  const file = readFileSync(join(__dirname, 'data/teams.yaml'), 'utf8')
  return parse(file) as TeamYaml[]
}

async function syncTeams() {
  const teams = loadTeams()
  console.log(`\nSyncing ${teams.length} team(s) → ${TABLES.MAIN}\n`)

  const now     = new Date().toISOString()
  const teamIds = teams.map(t => t.teamId)

  for (const team of teams) {
    await dynamo.send(new PutCommand({
      TableName: TABLES.MAIN,
      Item: {
        PK:        `TEAM#${team.teamId}`,
        SK:        'METADATA',
        teamId:    team.teamId,
        name:      team.name,
        leadId:    team.leadId,
        // memberIds is not set here — syncUsers.ts populates it via ADD
        createdAt: now,
        updatedAt: now,
      },
    }))

    console.log(`  ✓ ${team.teamId}  (${team.name})  lead: ${team.leadId}`)
  }

  // ── Upsert SYSTEM/ALL_TEAMS sentinel ──────────────────────────────────────
  await dynamo.send(new PutCommand({
    TableName: TABLES.MAIN,
    Item: {
      PK:        'SYSTEM',
      SK:        'ALL_TEAMS',
      teamIds:   new Set(teamIds),
      updatedAt: now,
    },
  }))
  console.log(`\n  ✓ SYSTEM/ALL_TEAMS updated  (${teamIds.length} teams)`)

  console.log('\nDone. Run npm run users:sync next to populate team members.\n')
}

syncTeams().catch(err => { console.error(err); process.exit(1) })

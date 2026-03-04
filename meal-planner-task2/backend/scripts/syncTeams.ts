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
  leadId: string
}

function loadTeams(): TeamYaml[] {
  const file = readFileSync(join(__dirname, 'data/teams.yaml'), 'utf8')
  return parse(file) as TeamYaml[]
}

async function syncTeams() {
  const teams = loadTeams()
  console.log(`\nSyncing ${teams.length} team(s) → ${TABLES.TEAMS}\n`)

  for (const team of teams) {
    const now = new Date().toISOString()

    await dynamo.send(new PutCommand({
      TableName: TABLES.TEAMS,
      Item: {
        teamId:    team.teamId,
        name:      team.name,
        leadId:    team.leadId,
        // memberIds is not set here — syncUsers.ts populates it via ADD
        createdAt: now,
        updatedAt: now,
      },
    }))

    console.log(`  ✓ ${team.teamId}  (${team.name})`)
  }

  console.log('\nDone. Run npm run users:sync next to populate team members.\n')
}

syncTeams().catch(err => { console.error(err); process.exit(1) })

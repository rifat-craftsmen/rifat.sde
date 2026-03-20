import 'dotenv/config'
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parse } from 'yaml'
import { UpdateCommand } from '@aws-sdk/lib-dynamodb'
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

  const now = new Date().toISOString()

  for (const team of teams) {
    await dynamo.send(new UpdateCommand({
      TableName:                 TABLES.MAIN,
      Key:                       { PK: 'TEAM', SK: team.teamId },
      // memberIds is not set here — syncUsers.ts populates it via ADD
      // createdAt uses if_not_exists to preserve the original timestamp on re-syncs
      UpdateExpression:          'SET teamId = :teamId, #name = :name, leadId = :leadId, updatedAt = :now, createdAt = if_not_exists(createdAt, :now)',
      ExpressionAttributeNames:  { '#name': 'name' },
      ExpressionAttributeValues: { ':teamId': team.teamId, ':name': team.name, ':leadId': team.leadId, ':now': now },
    }))

    console.log(`  ✓ ${team.teamId}  (${team.name})  lead: ${team.leadId}`)
  }

  console.log('\nDone. Run npm run users:sync next to populate team members.\n')
}

syncTeams().catch(err => { console.error(err); process.exit(1) })

import 'dotenv/config'
import { DynamoDBClient, CreateTableCommand, CreateTableCommandInput, ListTablesCommand, ResourceInUseException } from '@aws-sdk/client-dynamodb'

const client = new DynamoDBClient(
  process.env.DYNAMODB_ENDPOINT
    ? { region: 'local', endpoint: process.env.DYNAMODB_ENDPOINT }
    : { region: process.env.AWS_REGION || 'ap-southeast-1' },
)

const MAIN = process.env.DYNAMODB_TABLE_MAIN || 'trainee-2026-rifat-mealPlanner'

async function createIfNotExists(params: CreateTableCommandInput) {
  try {
    await client.send(new CreateTableCommand(params))
    console.log(`✓ Created table: ${params.TableName}`)
  } catch (e) {
    if (e instanceof ResourceInUseException) {
      console.log(`  Table already exists: ${params.TableName}`)
    } else {
      throw e
    }
  }
}

async function main() {
  console.log(`\nProvisioning DynamoDB tables in region: ${process.env.AWS_REGION || 'ap-southeast-1'}\n`)

  // ── Single table: mealPlanner ────────────────────────────────────────────
  // All entities share this table. 1 GSI (status-email-index) for active user
  // queries and Google Chat email-based identity lookup.
  //
  // Entity PK/SK patterns:
  //   UserProfile      PK: USER#{discordId}          SK: PROFILE
  //   MealRecord       PK: USER#{discordId}          SK: RECORD#{YYYY-MM-DD}
  //   MealSchedule     PK: SCHEDULE                  SK: {YYYY-MM-DD}
  //   Team             PK: TEAM                      SK: {teamId}
  //   WfhPeriod        PK: WFHPERIOD                 SK: {dateFrom}#{uuid}
  //   AuditLog         PK: AUDIT#{entityType}#{id}   SK: {timestamp}#{uuid}
  //
  // GSI: status-email-index
  //   GSI PK: status (ACTIVE | INACTIVE)   GSI SK: email
  //   Only UserProfile items are indexed (only entity with both attributes).
  //   Replaces ACTIVE_USERS sentinel — Query GSI PK=ACTIVE returns all active users.
  await createIfNotExists({
    TableName: MAIN,
    BillingMode: 'PAY_PER_REQUEST',
    AttributeDefinitions: [
      { AttributeName: 'PK',     AttributeType: 'S' },
      { AttributeName: 'SK',     AttributeType: 'S' },
      { AttributeName: 'status', AttributeType: 'S' },
      { AttributeName: 'email',  AttributeType: 'S' },
    ],
    KeySchema: [
      { AttributeName: 'PK', KeyType: 'HASH' },
      { AttributeName: 'SK', KeyType: 'RANGE' },
    ],
    GlobalSecondaryIndexes: [
      {
        IndexName: 'status-email-index',
        KeySchema: [
          { AttributeName: 'status', KeyType: 'HASH' },
          { AttributeName: 'email',  KeyType: 'RANGE' },
        ],
        Projection: { ProjectionType: 'ALL' },
      },
    ],
  })

  // ── Verify ───────────────────────────────────────────────────────────────
  const { TableNames } = await client.send(new ListTablesCommand({}))
  console.log(`\nTables in DynamoDB: ${TableNames?.join(', ')}\n`)
}

main().catch(err => { console.error(err); process.exit(1) })

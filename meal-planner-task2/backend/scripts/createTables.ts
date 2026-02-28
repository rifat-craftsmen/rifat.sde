import 'dotenv/config'
import { DynamoDBClient, CreateTableCommand, CreateTableCommandInput, ListTablesCommand, ResourceInUseException } from '@aws-sdk/client-dynamodb'

const client = new DynamoDBClient({
  region: process.env.AWS_REGION || 'ap-southeast-1',
  ...(process.env.DYNAMODB_ENDPOINT && { endpoint: process.env.DYNAMODB_ENDPOINT }),
})

const MAIN      = process.env.DYNAMODB_TABLE_MAIN      || 'mealPlanner'
const SCHEDULES = process.env.DYNAMODB_TABLE_SCHEDULES || 'mealSchedules'
const TEAMS     = process.env.DYNAMODB_TABLE_TEAMS     || 'teams'
const WFH       = process.env.DYNAMODB_TABLE_WFH       || 'globalWfhPeriods'

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
  console.log(`\nProvisioning DynamoDB tables against: ${process.env.DYNAMODB_ENDPOINT || 'AWS'}\n`)

  // ── Table 1: mealPlanner (Users + MealRecords) ──────────────────────────
  await createIfNotExists({
    TableName: MAIN,
    BillingMode: 'PAY_PER_REQUEST',
    AttributeDefinitions: [
      { AttributeName: 'PK',     AttributeType: 'S' },
      { AttributeName: 'SK',     AttributeType: 'S' },
      { AttributeName: 'gsi1pk', AttributeType: 'S' }, // discordId (users) | RECORD#date (records)
      { AttributeName: 'gsi2pk', AttributeType: 'S' }, // status (users)
      { AttributeName: 'gsi3pk', AttributeType: 'S' }, // teamId (users)
      { AttributeName: 'gsi4pk', AttributeType: 'S' }, // RECORD#{date} (records only)
    ],
    KeySchema: [
      { AttributeName: 'PK', KeyType: 'HASH' },
      { AttributeName: 'SK', KeyType: 'RANGE' },
    ],
    GlobalSecondaryIndexes: [
      {
        IndexName: 'discordId-index',
        KeySchema: [
          { AttributeName: 'gsi1pk', KeyType: 'HASH' },
          { AttributeName: 'SK',     KeyType: 'RANGE' },
        ],
        Projection: { ProjectionType: 'ALL' },
      },
      {
        IndexName: 'status-index',
        KeySchema: [
          { AttributeName: 'gsi2pk', KeyType: 'HASH' },
          { AttributeName: 'PK',     KeyType: 'RANGE' },
        ],
        Projection: { ProjectionType: 'ALL' },
      },
      {
        IndexName: 'team-index',
        KeySchema: [
          { AttributeName: 'gsi3pk', KeyType: 'HASH' },
          { AttributeName: 'PK',     KeyType: 'RANGE' },
        ],
        Projection: { ProjectionType: 'ALL' },
      },
      {
        IndexName: 'date-records-index',
        KeySchema: [
          { AttributeName: 'gsi4pk', KeyType: 'HASH' },
          { AttributeName: 'PK',     KeyType: 'RANGE' },
        ],
        Projection: { ProjectionType: 'ALL' },
      },
    ],
  })

  // ── Table 2: mealSchedules ───────────────────────────────────────────────
  await createIfNotExists({
    TableName: SCHEDULES,
    BillingMode: 'PAY_PER_REQUEST',
    AttributeDefinitions: [
      { AttributeName: 'date', AttributeType: 'S' },
    ],
    KeySchema: [
      { AttributeName: 'date', KeyType: 'HASH' },
    ],
  })

  // ── Table 3: teams ───────────────────────────────────────────────────────
  await createIfNotExists({
    TableName: TEAMS,
    BillingMode: 'PAY_PER_REQUEST',
    AttributeDefinitions: [
      { AttributeName: 'teamId', AttributeType: 'S' },
      { AttributeName: 'gsi1pk', AttributeType: 'S' }, // leadId
    ],
    KeySchema: [
      { AttributeName: 'teamId', KeyType: 'HASH' },
    ],
    GlobalSecondaryIndexes: [
      {
        IndexName: 'leadId-index',
        KeySchema: [
          { AttributeName: 'gsi1pk', KeyType: 'HASH' },
        ],
        Projection: { ProjectionType: 'ALL' },
      },
    ],
  })

  // ── Table 4: globalWfhPeriods ────────────────────────────────────────────
  await createIfNotExists({
    TableName: WFH,
    BillingMode: 'PAY_PER_REQUEST',
    AttributeDefinitions: [
      { AttributeName: 'id',     AttributeType: 'S' },
      { AttributeName: 'gsi1pk', AttributeType: 'S' }, // constant "WFH"
      { AttributeName: 'gsi1sk', AttributeType: 'S' }, // dateFrom for sorting
    ],
    KeySchema: [
      { AttributeName: 'id', KeyType: 'HASH' },
    ],
    GlobalSecondaryIndexes: [
      {
        IndexName: 'list-index',
        KeySchema: [
          { AttributeName: 'gsi1pk', KeyType: 'HASH' },
          { AttributeName: 'gsi1sk', KeyType: 'RANGE' },
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

import 'dotenv/config'
import { DynamoDBClient, CreateTableCommand, CreateTableCommandInput, ListTablesCommand, ResourceInUseException } from '@aws-sdk/client-dynamodb'


// --- when using aws dynamo ---
// const client = new DynamoDBClient({
//   region: process.env.AWS_REGION || 'ap-southeast-1',
// })

// --- when using local dynamo via docker ---
const client = new DynamoDBClient(
  process.env.DYNAMODB_ENDPOINT
    ? { region: 'local', endpoint: process.env.DYNAMODB_ENDPOINT }
    : { region: process.env.AWS_REGION || 'ap-southeast-1' },
)


const MAIN      = process.env.DYNAMODB_TABLE_MAIN      || 'trainee-2026-rifat-mealPlanner'
const SCHEDULES = process.env.DYNAMODB_TABLE_SCHEDULES || 'trainee-2026-rifat-mealSchedules'
const TEAMS     = process.env.DYNAMODB_TABLE_TEAMS     || 'trainee-2026-rifat-teams'
const WFH       = process.env.DYNAMODB_TABLE_WFH       || 'trainee-2026-rifat-globalWfhPeriods'

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

  // ── Table 1: mealPlanner (Users + MealRecords) ──────────────────────────
  // GSI 1: discordId-index  — look up user by Discord snowflake ID
  // GSI 2: date-records-index — fetch all meal records for a given date
  await createIfNotExists({
    TableName: MAIN,
    BillingMode: 'PAY_PER_REQUEST',
    AttributeDefinitions: [
      { AttributeName: 'PK',     AttributeType: 'S' },
      { AttributeName: 'SK',     AttributeType: 'S' },
      { AttributeName: 'gsi1pk', AttributeType: 'S' }, // discordId (UserItem only)
      { AttributeName: 'gsi2pk', AttributeType: 'S' }, // RECORD#{date} (MealRecordItem only)
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
        IndexName: 'date-records-index',
        KeySchema: [
          { AttributeName: 'gsi2pk', KeyType: 'HASH' },
          { AttributeName: 'PK',     KeyType: 'RANGE' },
        ],
        Projection: { ProjectionType: 'ALL' },
      },
    ],
  })

  // ── Table 2: mealSchedules ───────────────────────────────────────────────
  // Hash-only table — look up schedule by date string (YYYY-MM-DD)
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
  // Hash-only table — look up team by teamId
  // memberIds is a StringSet attribute (no GSI needed)
  await createIfNotExists({
    TableName: TEAMS,
    BillingMode: 'PAY_PER_REQUEST',
    AttributeDefinitions: [
      { AttributeName: 'teamId', AttributeType: 'S' },
    ],
    KeySchema: [
      { AttributeName: 'teamId', KeyType: 'HASH' },
    ],
  })

  // ── Table 4: globalWfhPeriods ────────────────────────────────────────────
  // PK = constant 'WFH', SK = uuid — query all periods with PK='WFH'
  await createIfNotExists({
    TableName: WFH,
    BillingMode: 'PAY_PER_REQUEST',
    AttributeDefinitions: [
      { AttributeName: 'PK', AttributeType: 'S' },
      { AttributeName: 'SK', AttributeType: 'S' },
    ],
    KeySchema: [
      { AttributeName: 'PK', KeyType: 'HASH' },
      { AttributeName: 'SK', KeyType: 'RANGE' },
    ],
  })

  // ── Verify ───────────────────────────────────────────────────────────────
  const { TableNames } = await client.send(new ListTablesCommand({}))
  console.log(`\nTables in DynamoDB: ${TableNames?.join(', ')}\n`)
}

main().catch(err => { console.error(err); process.exit(1) })

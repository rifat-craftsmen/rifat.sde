import {
  DynamoDBClient, CreateTableCommand, DeleteTableCommand,
} from '@aws-sdk/client-dynamodb'
import {
  DynamoDBDocumentClient, PutCommand, DeleteCommand, ScanCommand, BatchWriteCommand, GetCommand,
} from '@aws-sdk/lib-dynamodb'

const ENDPOINT = process.env.DYNAMODB_ENDPOINT || 'http://localhost:8000'
const TABLE = process.env.DYNAMODB_TABLE_MAIN || 'trainee-2026-rifat-mhp-v2'

// A client dedicated to test infrastructure (not the app's client).
const raw = new DynamoDBClient({ region: 'local', endpoint: ENDPOINT, credentials: { accessKeyId: 'local', secretAccessKey: 'local' } })
export const adminDoc = DynamoDBDocumentClient.from(raw, { marshallOptions: { removeUndefinedValues: true } })

export const TABLE_NAME = TABLE

/** Schema mirrors backend/scripts/createTables.ts exactly (1 GSI: status-email-index). */
export async function ensureTable(): Promise<void> {
  try {
    await raw.send(new CreateTableCommand({
      TableName: TABLE,
      BillingMode: 'PAY_PER_REQUEST',
      AttributeDefinitions: [
        { AttributeName: 'PK', AttributeType: 'S' },
        { AttributeName: 'SK', AttributeType: 'S' },
        { AttributeName: 'status', AttributeType: 'S' },
        { AttributeName: 'email', AttributeType: 'S' },
      ],
      KeySchema: [
        { AttributeName: 'PK', KeyType: 'HASH' },
        { AttributeName: 'SK', KeyType: 'RANGE' },
      ],
      GlobalSecondaryIndexes: [{
        IndexName: 'status-email-index',
        KeySchema: [
          { AttributeName: 'status', KeyType: 'HASH' },
          { AttributeName: 'email', KeyType: 'RANGE' },
        ],
        Projection: { ProjectionType: 'ALL' },
      }],
    }))
  } catch (e: any) {
    // Already exists — fine.
    if (e.name !== 'ResourceInUseException') throw e
  }
}

export async function dropTable(): Promise<void> {
  try {
    await raw.send(new DeleteTableCommand({ TableName: TABLE }))
  } catch (e: any) {
    if (e.name !== 'ResourceNotFoundException') throw e
  }
}

/** Wipe all rows (scan + batch delete) so each test starts clean. */
export async function resetTable(): Promise<void> {
  const scanned = await adminDoc.send(new ScanCommand({ TableName: TABLE }))
  const items = scanned.Items ?? []
  if (!items.length) return
  // Delete in 25-item BatchWrite chunks (PK+SK both required).
  for (let i = 0; i < items.length; i += 25) {
    const chunk = items.slice(i, i + 25)
    await adminDoc.send(new BatchWriteCommand({
      RequestItems: {
        [TABLE]: chunk.map(item => ({
          DeleteRequest: { Key: { PK: item.PK, SK: item.SK } },
        })),
      },
    }))
  }
}

export async function putItem(item: Record<string, any>): Promise<void> {
  await adminDoc.send(new PutCommand({ TableName: TABLE, Item: item }))
}

export async function deleteItem(pk: string, sk: string): Promise<void> {
  await adminDoc.send(new DeleteCommand({ TableName: TABLE, Key: { PK: pk, SK: sk } }))
}

export async function getItem(pk: string, sk: string): Promise<any | undefined> {
  const res = await adminDoc.send(new GetCommand({ TableName: TABLE, Key: { PK: pk, SK: sk } }))
  return res.Item
}

/** Seed a baseline world: two teams + four users spanning every role. */
export async function seedBaseWorld(): Promise<void> {
  const now = new Date().toISOString()
  await putItem({ PK: 'TEAM', SK: 'team-alpha', teamId: 'team-alpha', name: 'Team Alpha', leadId: 'lead-1', createdAt: now, updatedAt: now })
  await putItem({ PK: 'TEAM', SK: 'team-beta', teamId: 'team-beta', name: 'Team Beta', leadId: 'lead-2', createdAt: now, updatedAt: now })

  // Users: status is indexed on the GSI (PK=status, SK=email).
  const users = [
    { discordId: 'admin-1', name: 'Ada Admin', email: 'admin@example.com', role: 'ADMIN', teamId: 'team-alpha', teamName: 'Team Alpha' },
    { discordId: 'lead-1', name: 'Lee Lead', email: 'lead@example.com', role: 'LEAD', teamId: 'team-alpha', teamName: 'Team Alpha' },
    { discordId: 'logistics-1', name: 'Logan', email: 'logistics@example.com', role: 'LOGISTICS', teamId: 'team-beta', teamName: 'Team Beta' },
    { discordId: 'employee-1', name: 'Eve Employee', email: 'employee@example.com', role: 'EMPLOYEE', teamId: 'team-alpha', teamName: 'Team Alpha' },
  ]
  for (const u of users) {
    await putItem({
      PK: `USER#${u.discordId}`, SK: 'PROFILE',
      discordId: u.discordId, name: u.name, email: u.email, role: u.role,
      status: 'ACTIVE', teamId: u.teamId, teamName: u.teamName,
      wfhCount: 0, wfhMonth: `${new Date().getUTCFullYear()}-${String(new Date().getUTCMonth()+1).padStart(2,'0')}`,
      createdAt: now, updatedAt: now,
    })
  }
}

import { PutCommand, QueryCommand, UpdateCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb'
import { randomUUID } from 'node:crypto'
import { dynamo, TABLES } from '../config/dynamoClient.js'
import { writeAuditLog } from './auditService.js'
import type { WfhPeriodItem, CreateWfhPeriodData, UpdateWfhPeriodData } from '../types/index.js'

export async function createWfhPeriod(
  data: CreateWfhPeriodData,
  actorDiscordId: string,
): Promise<WfhPeriodItem> {
  const id  = randomUUID().replace(/-/g, '').slice(0, 8)
  const now = new Date().toISOString()

  const item: WfhPeriodItem = {
    PK:        'WFHPERIOD',
    SK:        `${data.dateFrom}#${id}`,
    id,
    dateFrom:  data.dateFrom,
    dateTo:    data.dateTo,
    note:      data.note,
    createdAt: now,
    updatedAt: now,
  }

  await dynamo.send(new PutCommand({ TableName: TABLES.MAIN, Item: item }))

  await writeAuditLog({
    actorDiscordId,
    actorName:  actorDiscordId,
    action:     'CREATE',
    entityType: 'WFH_PERIOD',
    entityId:   item.SK,
    changes: {
      dateFrom: { old: null, new: data.dateFrom },
      dateTo:   { old: null, new: data.dateTo },
      note:     { old: null, new: data.note ?? null },
    },
  })

  return item
}

export async function listWfhPeriods(): Promise<WfhPeriodItem[]> {
  const result = await dynamo.send(new QueryCommand({
    TableName: TABLES.MAIN,
    KeyConditionExpression: 'PK = :pk',
    ExpressionAttributeValues: { ':pk': 'WFHPERIOD' },
  }))
  return (result.Items ?? []) as WfhPeriodItem[]
}

async function findById(id: string): Promise<WfhPeriodItem | undefined> {
  const all = await listWfhPeriods()
  return all.find(p => p.id === id)
}

export async function updateWfhPeriod(
  id: string,
  data: UpdateWfhPeriodData,
  actorDiscordId: string,
): Promise<void> {
  const existing = await findById(id)
  if (!existing) throw new Error('WFH period not found')

  const now = new Date().toISOString()
  const setClauses: string[]                               = ['updatedAt = :updatedAt']
  const exprValues: Record<string, unknown>                = { ':updatedAt': now }
  const changes:    Record<string, { old: unknown; new: unknown }> = {}

  if (data.dateFrom !== undefined) {
    setClauses.push('dateFrom = :dateFrom')
    exprValues[':dateFrom'] = data.dateFrom
    changes['dateFrom'] = { old: existing.dateFrom, new: data.dateFrom }
  }
  if (data.dateTo !== undefined) {
    setClauses.push('dateTo = :dateTo')
    exprValues[':dateTo'] = data.dateTo
    changes['dateTo'] = { old: existing.dateTo, new: data.dateTo }
  }
  if (data.note !== undefined) {
    setClauses.push('note = :note')
    exprValues[':note'] = data.note
    changes['note'] = { old: existing.note ?? null, new: data.note }
  }

  await dynamo.send(new UpdateCommand({
    TableName: TABLES.MAIN,
    Key: { PK: 'WFHPERIOD', SK: existing.SK },
    UpdateExpression: `SET ${setClauses.join(', ')}`,
    ExpressionAttributeValues: exprValues,
  }))

  await writeAuditLog({
    actorDiscordId,
    actorName:  actorDiscordId,
    action:     'UPDATE',
    entityType: 'WFH_PERIOD',
    entityId:   existing.SK,
    changes,
  })
}

export async function deleteWfhPeriod(
  id: string,
  actorDiscordId: string,
): Promise<void> {
  const existing = await findById(id)
  if (!existing) throw new Error('WFH period not found')

  await dynamo.send(new DeleteCommand({
    TableName: TABLES.MAIN,
    Key: { PK: 'WFHPERIOD', SK: existing.SK },
  }))

  await writeAuditLog({
    actorDiscordId,
    actorName:  actorDiscordId,
    action:     'DELETE',
    entityType: 'WFH_PERIOD',
    entityId:   existing.SK,
    changes: {
      dateFrom: { old: existing.dateFrom, new: null },
      dateTo:   { old: existing.dateTo,   new: null },
      note:     { old: existing.note ?? null, new: null },
    },
  })
}

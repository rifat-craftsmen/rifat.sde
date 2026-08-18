import { PutCommand } from '@aws-sdk/lib-dynamodb'
import { randomUUID } from 'node:crypto'
import { dynamo, TABLES } from '../config/dynamoClient.js'
import type { AuditAction, AuditEntityType, AuditLogItem } from '../types/index.js'

export interface WriteAuditLogInput {
  actorDiscordId:   string
  actorName:        string
  action:           AuditAction
  entityType:       AuditEntityType
  entityId:         string
  targetDiscordId?: string
  changes?:         Record<string, { old: unknown; new: unknown }>
  metadata?:        Record<string, unknown>
}

/**
 * Writes an immutable audit entry for every mutation.
 * PK = AUDIT#{entityType}#{entityId}
 * SK  = {timestamp}#{uuid}  — chronological ordering + uniqueness
 */
export async function writeAuditLog(input: WriteAuditLogInput): Promise<void> {
  const timestamp = new Date().toISOString()
  const id        = randomUUID()

  const item: AuditLogItem = {
    PK:               `AUDIT#${input.entityType}#${input.entityId}`,
    SK:               `${timestamp}#${id}`,
    id,
    timestamp,
    actorDiscordId:   input.actorDiscordId,
    actorName:        input.actorName,
    action:           input.action,
    entityType:       input.entityType,
    entityId:         input.entityId,
    targetDiscordId:  input.targetDiscordId,
    changes:          input.changes,
    metadata:         input.metadata,
  }

  await dynamo.send(new PutCommand({
    TableName: TABLES.MAIN,
    Item:      item,
  }))
}

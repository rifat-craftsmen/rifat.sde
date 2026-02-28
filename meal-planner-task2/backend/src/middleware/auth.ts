import { Response, NextFunction } from 'express'
import { QueryCommand } from '@aws-sdk/lib-dynamodb'
import { AuthRequest, Role } from '../types/index.js'
import { dynamo, TABLES } from '../config/dynamoClient.js'

const VALID_ROLES: Role[] = ['EMPLOYEE', 'LEAD', 'ADMIN', 'LOGISTICS']

export const discordAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  // 1. Validate bot secret
  const secret = req.headers['x-bot-secret']
  if (!secret || secret !== process.env.BOT_SECRET) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }

  // 2. Extract Discord identity from headers
  const discordId   = req.headers['x-discord-id']   as string | undefined
  const discordRole = req.headers['x-discord-role']  as string | undefined

  if (!discordId || !discordRole) {
    res.status(400).json({ error: 'Missing x-discord-id or x-discord-role header' })
    return
  }

  if (!VALID_ROLES.includes(discordRole as Role)) {
    res.status(400).json({ error: `Invalid role: ${discordRole}` })
    return
  }

  // 3. Resolve discordId → userId + teamId (one GSI query)
  try {
    const result = await dynamo.send(new QueryCommand({
      TableName: TABLES.MAIN,
      IndexName: 'discordId-index',
      KeyConditionExpression: 'gsi1pk = :did AND SK = :profile',
      ExpressionAttributeValues: { ':did': discordId, ':profile': 'PROFILE' },
      Limit: 1,
    }))

    const user = result.Items?.[0]
    if (!user) {
      res.status(403).json({ error: 'User not registered. Ask an admin to add you.' })
      return
    }

    req.user = {
      userId:      user['userId'] as string,
      discordId,
      discordRole: discordRole as Role,
      teamId:      user['teamId'] as string | undefined,
    }
    next()
  } catch (err) {
    next(err)
  }
}

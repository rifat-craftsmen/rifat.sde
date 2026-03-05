import { Response, NextFunction } from 'express'
import { QueryCommand } from '@aws-sdk/lib-dynamodb'
import { AuthRequest, Role } from '../types/index.js'
import { dynamo, TABLES } from '../config/dynamoClient.js'

/**
 * Extracts identity from the verified Discord interaction payload.
 * Must run after discordVerify (req.body is already the parsed interaction object).
 *
 * Role is read from the DynamoDB user record (source of truth).
 * Sets req.user = { userId, discordId, role, teamId? }
 */
export const discordAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const interaction = req.body
  const discordId   = interaction?.member?.user?.id as string | undefined

  if (!discordId) {
    res.json({ type: 4, data: { content: 'Could not identify your Discord user.', flags: 64 } })
    return
  }

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
      res.json({ type: 4, data: { content: 'You are not registered in the system. Ask an admin to add you.', flags: 64 } })
      return
    }

    req.user = {
      userId:    user['userId'] as string,
      discordId,
      role:      user['role'] as Role,
      teamId:    user['teamId'] as string | undefined,
    }
    next()
  } catch (err) {
    next(err)
  }
}

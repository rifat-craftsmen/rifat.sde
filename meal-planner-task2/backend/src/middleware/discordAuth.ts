import { Response, NextFunction } from 'express'
import { GetCommand } from '@aws-sdk/lib-dynamodb'
import { AuthRequest, Role } from '../types/index.js'
import { dynamo, TABLES } from '../config/dynamoClient.js'

/**
 * Extracts identity from the verified Discord interaction payload.
 * Must run after discordVerify (req.body is already the parsed interaction object).
 *
 * - Looks up user profile via GetItem PK=USER#{discordId}, SK=PROFILE
 * - Role is read directly from the DB profile (single source of truth for both platforms)
 * - Sets req.user = { discordId, role, teamId? }
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
    const result = await dynamo.send(new GetCommand({
      TableName: TABLES.MAIN,
      Key: { PK: `USER#${discordId}`, SK: 'PROFILE' },
    }))

    if (!result.Item) {
      res.json({ type: 4, data: { content: 'You are not registered in the system. Ask an admin to add you.', flags: 64 } })
      return
    }

    req.user = {
      discordId,
      role:   result.Item['role'] as Role,
      teamId: result.Item['teamId'] as string | undefined,
    }
    next()
  } catch (err) {
    next(err)
  }
}

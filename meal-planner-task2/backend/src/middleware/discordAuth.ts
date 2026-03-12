import { Response, NextFunction } from 'express'
import { GetCommand } from '@aws-sdk/lib-dynamodb'
import { AuthRequest, Role } from '../types/index.js'
import { dynamo, TABLES } from '../config/dynamoClient.js'

/**
 * Resolves application role from Discord guild role snowflake IDs.
 * Priority: ADMIN > LEAD > LOGISTICS > EMPLOYEE
 * Configured via env vars set at deployment time.
 */
function resolveRole(discordRoles: string[]): Role {
  if (process.env.DISCORD_ROLE_ADMIN     && discordRoles.includes(process.env.DISCORD_ROLE_ADMIN))     return 'ADMIN'
  if (process.env.DISCORD_ROLE_LEAD      && discordRoles.includes(process.env.DISCORD_ROLE_LEAD))      return 'LEAD'
  if (process.env.DISCORD_ROLE_LOGISTICS && discordRoles.includes(process.env.DISCORD_ROLE_LOGISTICS)) return 'LOGISTICS'
  return 'EMPLOYEE'
}

/**
 * Extracts identity from the verified Discord interaction payload.
 * Must run after discordVerify (req.body is already the parsed interaction object).
 *
 * - Looks up user profile via GetItem PK=USER#{discordId}, SK=PROFILE
 * - Role is resolved from Discord guild role IDs (not from DB)
 * - Sets req.user = { discordId, role, teamId? }
 */
export const discordAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const interaction  = req.body
  const discordId    = interaction?.member?.user?.id as string | undefined
  const discordRoles = (interaction?.member?.roles ?? []) as string[]

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
      role:   resolveRole(discordRoles),
      teamId: result.Item['teamId'] as string | undefined,
    }
    next()
  } catch (err) {
    next(err)
  }
}

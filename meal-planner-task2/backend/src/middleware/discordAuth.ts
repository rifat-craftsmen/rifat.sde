import { Response, NextFunction } from 'express'
import { QueryCommand } from '@aws-sdk/lib-dynamodb'
import { AuthRequest, Role } from '../types/index.js'
import { dynamo, TABLES } from '../config/dynamoClient.js'

/**
 * Resolves the highest-privilege app role from the user's Discord role IDs.
 * Role snowflake IDs are configured via env vars.
 * Precedence: ADMIN > LEAD > LOGISTICS > EMPLOYEE (default)
 */
function resolveRole(discordRoles: string[]): Role {
  if (process.env.DISCORD_ROLE_ADMIN && discordRoles.includes(process.env.DISCORD_ROLE_ADMIN)) {
    return 'ADMIN'
  }
  if (process.env.DISCORD_ROLE_LEAD && discordRoles.includes(process.env.DISCORD_ROLE_LEAD)) {
    return 'LEAD'
  }
  if (process.env.DISCORD_ROLE_LOGISTICS && discordRoles.includes(process.env.DISCORD_ROLE_LOGISTICS)) {
    return 'LOGISTICS'
  }
  return 'EMPLOYEE'
}

/**
 * Extracts identity from the verified Discord interaction payload.
 * Must run after discordVerify (req.body is already the parsed interaction object).
 *
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
    res.status(401).json({ error: 'Missing Discord user identity in interaction payload' })
    return
  }

  const discordRoles: string[] = interaction.member?.roles ?? []
  const role = resolveRole(discordRoles)

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
      userId:    user['userId'] as string,
      discordId,
      role,
      teamId:    user['teamId'] as string | undefined,
    }
    next()
  } catch (err) {
    next(err)
  }
}

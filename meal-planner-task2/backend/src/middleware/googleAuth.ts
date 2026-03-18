import { Response, NextFunction } from 'express'
import { QueryCommand } from '@aws-sdk/lib-dynamodb'
import { AuthRequest, Role, UserItem } from '../types/index.js'
import { dynamo, TABLES } from '../config/dynamoClient.js'

/**
 * Extracts identity from the verified Google Chat interaction payload.
 * Must run after the Google Chat Authorizer Lambda has verified the JWT.
 *
 * - Extracts the sender's Google Workspace email from the event payload.
 * - Queries status-email-index GSI: PK=ACTIVE SK={email} → UserProfile.
 * - Reads role directly from the UserProfile (same source as discordAuth).
 * - Sets req.user = { discordId, role, teamId? } — identical shape to discordAuth
 *   so all downstream command handlers and requireRole middleware are shared.
 */
export const googleAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const event = req.body
  console.log('[googleAuth] body:', JSON.stringify(event))
  const email = event?.user?.email as string | undefined

  if (!email) {
    res.json({ text: 'Could not identify your Google account.' })
    return
  }

  try {
    const result = await dynamo.send(new QueryCommand({
      TableName:                 TABLES.MAIN,
      IndexName:                 'status-email-index',
      KeyConditionExpression:    '#status = :active AND email = :email',
      ExpressionAttributeNames:  { '#status': 'status' },
      ExpressionAttributeValues: { ':active': 'ACTIVE', ':email': email },
      Limit: 1,
    }))

    const profile = result.Items?.[0] as UserItem | undefined

    if (!profile) {
      res.json({ text: 'You are not registered in the system. Ask an admin to add you.' })
      return
    }

    req.user = {
      discordId: profile.discordId,
      role:      profile.role as Role,
      teamId:    profile.teamId,
      platform:  'google',
    }
    next()
  } catch (err) {
    next(err)
  }
}

import { GetCommand } from '@aws-sdk/lib-dynamodb'
import { dynamo, TABLES } from '../config/dynamoClient.js'
import { AuthRequest, MealUpdateData, MealScheduleItem } from '../types/index.js'
import { getUserByEmail } from '../services/teamService.js'

const DEFAULT_SCHEDULE = {
  lunchEnabled:          true,
  snacksEnabled:         true,
  iftarEnabled:          false,
  eventDinnerEnabled:    false,
  optionalDinnerEnabled: false,
}

interface DiscordOption {
  name:  string
  value: string | boolean | number
}

function opt<T>(options: DiscordOption[], name: string): T | undefined {
  const found = options.find(o => o.name === name)
  return found !== undefined ? (found.value as T) : undefined
}

/** 3-state token parser for Google Chat text commands.
 *  `token`  → true  (opted in)
 *  `-token` → false (explicit opt-out)
 *  absent   → undefined (carry-forward / not specified)
 */
function parseToken(tokens: string[], name: string): boolean | undefined {
  if (tokens.includes(name))       return true
  if (tokens.includes(`-${name}`)) return false
  return undefined
}

/**
 * Resolves the target discordId from the request.
 * Discord: reads the `user` option (User picker → Discord ID).
 * Google Chat: reads the USER_MENTION annotation email → looks up profile.
 *
 * Returns { targetId } on success or { error } on failure.
 */
export async function resolveProxyTarget(
  req: AuthRequest,
): Promise<{ targetId: string; targetName: string; error?: never } | { targetId?: never; targetName?: never; error: string }> {
  if (req.user!.platform === 'google') {
    const annotations: any[] = req.body?.message?.annotations ?? []
    const mention = annotations.find((a: any) => a.type === 'USER_MENTION')
    const email: string | undefined = mention?.userMention?.user?.email
    if (!email) {
      return { error: 'Please @mention a team member. Example: `/create-employee-meal @Samin Yasar 2026-03-25 lunch`' }
    }
    const profile = await getUserByEmail(email)
    if (!profile) {
      return { error: 'No active user found for the mentioned account.' }
    }
    return { targetId: profile.discordId, targetName: profile.name }
  }

  // Discord: User picker option — <@id> mentions work natively, name not needed
  const options: DiscordOption[] = req.body.data?.options ?? []
  const targetId = opt<string>(options, 'user')
  if (!targetId) return { error: 'Please specify a team member.' }
  return { targetId, targetName: `<@${targetId}>` }
}

/**
 * Parses date + meal options for a proxy command.
 * Discord: same named options as create/update-meal (user is a separate option, ignored here).
 * Google Chat: argumentText is "@Mention YYYY-MM-DD meal1 meal2 ..."
 *              — locates the date by regex, parses everything after it.
 */
export async function parseProxyMealOptions(req: AuthRequest): Promise<MealUpdateData> {
  if (req.user!.platform === 'google') {
    const argText = (req.body?.message?.argumentText as string ?? '').trim()
    const parts   = argText.split(/\s+/)
    // Find the first YYYY-MM-DD token — everything before it is the @mention display name
    const dateIdx = parts.findIndex(p => /^\d{4}-\d{2}-\d{2}$/.test(p))
    const date    = dateIdx >= 0 ? parts[dateIdx] : ''
    const tokens  = dateIdx >= 0 ? parts.slice(dateIdx + 1).map(t => t.toLowerCase()) : []

    // Fetch schedule to know which meals are enabled for this date
    let schedule: typeof DEFAULT_SCHEDULE = DEFAULT_SCHEDULE
    if (date) {
      const result = await dynamo.send(new GetCommand({
        TableName: TABLES.MAIN,
        Key: { PK: 'SCHEDULE', SK: date },
      }))
      if (result.Item) schedule = result.Item as MealScheduleItem
    }

    // Enabled meals: listed = true, not listed = false (explicit opt-out, cron won't overwrite)
    // Disabled meals: null (cron also ignores them, no point opting out of something not offered)
    return {
      date,
      lunch:          schedule.lunchEnabled          ? parseToken(tokens, 'lunch')          : null,
      snacks:         schedule.snacksEnabled         ? parseToken(tokens, 'snacks')         : null,
      iftar:          schedule.iftarEnabled          ? parseToken(tokens, 'iftar')          : null,
      eventDinner:    schedule.eventDinnerEnabled    ? parseToken(tokens, 'eventdinner')    : null,
      optionalDinner: schedule.optionalDinnerEnabled ? parseToken(tokens, 'optionaldinner') : null,
      workFromHome:   parseToken(tokens, 'wfh'),
    }
  }

  const options: DiscordOption[] = req.body.data?.options ?? []
  return {
    date:           opt<string>(options, 'date') ?? '',
    lunch:          opt<boolean>(options, 'lunch'),
    snacks:         opt<boolean>(options, 'snacks'),
    iftar:          opt<boolean>(options, 'iftar'),
    eventDinner:    opt<boolean>(options, 'event_dinner'),
    optionalDinner: opt<boolean>(options, 'optional_dinner'),
    workFromHome:   opt<boolean>(options, 'work_from_home'),
  }
}

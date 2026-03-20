import { AuthRequest, MealUpdateData } from '../types/index.js'
import { getUserByEmail } from '../services/teamService.js'

interface DiscordOption {
  name:  string
  value: string | boolean | number
}

function opt<T>(options: DiscordOption[], name: string): T | undefined {
  const found = options.find(o => o.name === name)
  return found !== undefined ? (found.value as T) : undefined
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
): Promise<{ targetId: string; error?: never } | { targetId?: never; error: string }> {
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
    return { targetId: profile.discordId }
  }

  // Discord: User picker option
  const options: DiscordOption[] = req.body.data?.options ?? []
  const targetId = opt<string>(options, 'user')
  if (!targetId) return { error: 'Please specify a team member.' }
  return { targetId }
}

/**
 * Parses date + meal options for a proxy command.
 * Discord: same named options as create/update-meal (user is a separate option, ignored here).
 * Google Chat: argumentText is "@Mention YYYY-MM-DD meal1 meal2 ..."
 *              — locates the date by regex, parses everything after it.
 */
export function parseProxyMealOptions(req: AuthRequest): MealUpdateData {
  if (req.user!.platform === 'google') {
    const argText = (req.body?.message?.argumentText as string ?? '').trim()
    const parts   = argText.split(/\s+/)
    // Find the first YYYY-MM-DD token — everything before it is the @mention display name
    const dateIdx = parts.findIndex(p => /^\d{4}-\d{2}-\d{2}$/.test(p))
    const date    = dateIdx >= 0 ? parts[dateIdx] : ''
    const tokens  = dateIdx >= 0 ? parts.slice(dateIdx + 1).map(t => t.toLowerCase()) : []
    return {
      date,
      lunch:          tokens.includes('lunch')          ? true : undefined,
      snacks:         tokens.includes('snacks')         ? true : undefined,
      iftar:          tokens.includes('iftar')          ? true : undefined,
      eventDinner:    tokens.includes('eventdinner')    ? true : undefined,
      optionalDinner: tokens.includes('optionaldinner') ? true : undefined,
      workFromHome:   tokens.includes('wfh')            ? true : undefined,
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

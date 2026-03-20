import { Response } from 'express'
import { AuthRequest } from '../types/index.js'
import { getMySchedule } from '../services/mealService.js'
import { isTeamMember, getUserByEmail } from '../services/teamService.js'
import type { ScheduleDay, MealScheduleItem } from '../types/index.js'

const MEALS: Array<{ key: keyof MealScheduleItem; label: string }> = [
  { key: 'lunchEnabled',          label: 'L' },
  { key: 'snacksEnabled',         label: 'S' },
  { key: 'iftarEnabled',          label: 'I' },
  { key: 'eventDinnerEnabled',    label: 'ED' },
  { key: 'optionalDinnerEnabled', label: 'OD' },
]

const MEAL_RECORD_KEYS = ['lunch', 'snacks', 'iftar', 'eventDinner', 'optionalDinner'] as const

function formatDay(day: ScheduleDay): string {
  const date   = new Date(day.date + 'T00:00:00Z')
  const label  = date.toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short', timeZone: 'UTC' })
  const prefix = day.isToday ? '**Today** ' : ''

  const mealCols = MEALS.map((m, i) => {
    const enabled = day.schedule?.[m.key] as boolean | undefined
    if (!enabled) return '➖'
    const chosen = day.record?.[MEAL_RECORD_KEYS[i]]
    if (chosen === true)  return `${m.label}:✅`
    if (chosen === false) return `${m.label}:❌`
    return `${m.label}:⬜`
  }).join('  ')

  const wfh = (day.record?.workFromHome || day.globalWFH) ? '  🏠' : ''
  return `${prefix}${label}  ${mealCols}${wfh}`
}

export async function handleEmployeeSchedule(req: AuthRequest, res: Response): Promise<void> {
  const user = req.user!

  if (user.role !== 'LEAD' && user.role !== 'ADMIN') {
    res.json({ type: 4, data: { content: 'Only leads and admins can view a team member\'s schedule.', flags: 64 } })
    return
  }

  // Parse target discordId
  let targetId: string
  if (user.platform === 'google') {
    // Google Chat: extract email from @mention annotation
    const annotations: any[] = req.body?.message?.annotations ?? []
    const mention = annotations.find((a: any) => a.type === 'USER_MENTION')
    const email: string | undefined = mention?.userMention?.user?.email
    if (!email) {
      res.json({ text: 'Please @mention a team member. Example: `/employee-schedule @Samin Yasar`' })
      return
    }
    const profile = await getUserByEmail(email)
    if (!profile) {
      res.json({ text: `No active user found for the mentioned account.` })
      return
    }
    targetId = profile.discordId
  } else {
    // Discord User option — value is the selected user's Discord ID
    const options: Array<{ name: string; value: string }> = req.body.data?.options ?? []
    targetId = options.find(o => o.name === 'user')?.value ?? ''
    if (!targetId) {
      res.json({ type: 4, data: { content: 'Please specify a team member.', flags: 64 } })
      return
    }
  }

  // LEAD must verify the target belongs to their team; ADMIN has no restriction
  if (user.role === 'LEAD') {
    if (!user.teamId) {
      res.json({ type: 4, data: { content: 'You are not assigned to a team.', flags: 64 } })
      return
    }
    const member = await isTeamMember(user.teamId, targetId)
    if (!member) {
      res.json({ type: 4, data: { content: 'That user is not in your team.', flags: 64 } })
      return
    }
  }

  const days = await getMySchedule(targetId)

  const lines  = days.map(formatDay)
  const legend = '*✅ opted in  ❌ opted out  ⬜ not set  ➖ not offered  🏠 WFH*'

  res.json({
    type: 4,
    data: {
      content: `📅 **Schedule for <@${targetId}>**\n\n${lines.join('\n')}\n\n${legend}`,
      flags: 64,
    },
  })
}

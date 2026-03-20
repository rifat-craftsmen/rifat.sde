import { Response } from 'express'
import { AuthRequest, BulkAction } from '../types/index.js'
import { applyBulkAction, getAllActiveMemberIds } from '../services/bulkUpdateService.js'
import { getTeamMembers } from '../services/teamService.js'

const DATE_RE   = /^\d{4}-\d{2}-\d{2}$/
const VALID_ACTIONS: BulkAction[] = ['WFH_ALL', 'ALL_OFF', 'SET_ALL_MEALS', 'UNSET_ALL_MEALS']

const ACTION_LABELS: Record<BulkAction, string> = {
  WFH_ALL:        'WFH flagged for all members',
  ALL_OFF:        'All meals turned off for all members',
  SET_ALL_MEALS:  'All schedule meals opted in for all members',
  UNSET_ALL_MEALS:'All meal choices cleared for all members',
}

export async function handleBulkUpdate(req: AuthRequest, res: Response): Promise<void> {
  const user     = req.user!
  const isGoogle = user.platform === 'google'

  if (user.role !== 'LEAD' && user.role !== 'ADMIN') {
    const msg = 'Only leads and admins can perform bulk updates.'
    res.json(isGoogle ? { text: msg } : { type: 4, data: { content: msg, flags: 64 } })
    return
  }

  // ── Parse date + action ───────────────────────────────────────────────────
  let date: string
  let action: string

  if (isGoogle) {
    const parts = (req.body?.message?.argumentText as string ?? '').trim().split(/\s+/)
    date   = parts[0] ?? ''
    action = (parts[1] ?? '').toUpperCase()
  } else {
    const options: Array<{ name: string; value: string }> = req.body.data?.options ?? []
    date   = options.find(o => o.name === 'date')?.value   ?? ''
    action = options.find(o => o.name === 'action')?.value ?? ''
  }

  if (!DATE_RE.test(date)) {
    const msg = 'Invalid date format. Use YYYY-MM-DD.'
    res.json(isGoogle ? { text: msg } : { type: 4, data: { content: msg, flags: 64 } })
    return
  }

  if (!VALID_ACTIONS.includes(action as BulkAction)) {
    const msg = `Invalid action. Choose one of: ${VALID_ACTIONS.join(', ')}.`
    res.json(isGoogle ? { text: msg } : { type: 4, data: { content: msg, flags: 64 } })
    return
  }

  // ── Resolve member list ───────────────────────────────────────────────────
  let memberIds: string[]

  if (user.role === 'LEAD') {
    if (!user.teamId) {
      const msg = 'You are not assigned to a team.'
      res.json(isGoogle ? { text: msg } : { type: 4, data: { content: msg, flags: 64 } })
      return
    }
    const { members } = await getTeamMembers(user.teamId)
    memberIds = members.map(m => m.discordId)
  } else {
    memberIds = await getAllActiveMemberIds()
  }

  if (!memberIds.length) {
    const msg = 'No members found to update.'
    res.json(isGoogle ? { text: msg } : { type: 4, data: { content: msg, flags: 64 } })
    return
  }

  // ── Apply ─────────────────────────────────────────────────────────────────
  const count = await applyBulkAction(memberIds, date, action as BulkAction, user.discordId)

  const label = ACTION_LABELS[action as BulkAction]
  const msg   = `✅ **${label}** on **${date}**. (${count}/${memberIds.length} records updated)`
  res.json(isGoogle ? { text: msg } : { type: 4, data: { content: msg, flags: 64 } })
}

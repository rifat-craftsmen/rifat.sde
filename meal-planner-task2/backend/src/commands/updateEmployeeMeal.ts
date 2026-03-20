import { Response } from 'express'
import { AuthRequest } from '../types/index.js'
import { createOrUpdateMealRecord } from '../services/mealService.js'
import { isTeamMember } from '../services/teamService.js'
import { resolveProxyTarget, parseProxyMealOptions } from './_proxyHelpers.js'
import { validateMealDate } from './_mealChoiceHelpers.js'

export async function handleUpdateEmployeeMeal(req: AuthRequest, res: Response): Promise<void> {
  const user = req.user!
  const isGoogle = user.platform === 'google'

  if (user.role !== 'LEAD' && user.role !== 'ADMIN') {
    const msg = 'Only leads and admins can update meal records for team members.'
    res.json(isGoogle ? { text: msg } : { type: 4, data: { content: msg, flags: 64 } })
    return
  }

  const resolved = await resolveProxyTarget(req)
  if (resolved.error) {
    res.json(isGoogle ? { text: resolved.error } : { type: 4, data: { content: resolved.error, flags: 64 } })
    return
  }
  const targetId = resolved.targetId

  // LEAD is scoped to their own team
  if (user.role === 'LEAD') {
    if (!user.teamId) {
      const msg = 'You are not assigned to a team.'
      res.json(isGoogle ? { text: msg } : { type: 4, data: { content: msg, flags: 64 } })
      return
    }
    const member = await isTeamMember(user.teamId, targetId)
    if (!member) {
      const msg = 'That user is not in your team.'
      res.json(isGoogle ? { text: msg } : { type: 4, data: { content: msg, flags: 64 } })
      return
    }
  }

  const data = parseProxyMealOptions(req)
  const err  = validateMealDate(data.date)
  if (err) {
    res.json(isGoogle ? { text: err } : { type: 4, data: { content: err, flags: 64 } })
    return
  }

  try {
    await createOrUpdateMealRecord(targetId, data, user.discordId)
  } catch (e: unknown) {
    if (e instanceof Error && e.message === 'User profile not found') {
      const msg = 'Target user profile not found.'
      res.json(isGoogle ? { text: msg } : { type: 4, data: { content: msg, flags: 64 } })
      return
    }
    throw e
  }

  const wfhNote = data.workFromHome ? ' — 🏠 WFH noted.' : '.'
  const msg = `Meal record updated for <@${targetId}> on **${data.date}**${wfhNote}`
  res.json(isGoogle ? { text: msg } : { type: 4, data: { content: msg, flags: 64 } })
}

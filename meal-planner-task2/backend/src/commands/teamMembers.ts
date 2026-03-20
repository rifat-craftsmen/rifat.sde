import { Response } from 'express'
import { AuthRequest } from '../types/index.js'
import { getTeamMembers, getAllActiveMembers } from '../services/teamService.js'
import type { TeamMemberView } from '../services/teamService.js'

export async function handleTeamMembers(req: AuthRequest, res: Response): Promise<void> {
  const user = req.user!

  if (user.role !== 'LEAD' && user.role !== 'ADMIN') {
    res.json({ type: 4, data: { content: 'Only leads and admins can view team members.', flags: 64 } })
    return
  }

  const now   = new Date()
  const month = now.toLocaleString('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' })

  if (user.role === 'ADMIN') {
    // Admin sees all active employees grouped by team
    const members = await getAllActiveMembers()
    if (!members.length) {
      res.json({ type: 4, data: { content: 'No active employees found.', flags: 64 } })
      return
    }

    const lines = members.map(m => {
      const status = m.status === 'ACTIVE' ? '🟢' : '🔴'
      return `${status} **${m.name}** *[${m.teamName}]* — WFH this month: ${m.wfhCount}`
    })

    const content = `👥 **All Employees** *(${members.length} active) — ${month}*\n\n${lines.join('\n')}`
    res.json({ type: 4, data: { content, flags: 64 } })
    return
  }

  // LEAD sees only their own team
  if (!user.teamId) {
    res.json({ type: 4, data: { content: 'You are not assigned to a team.', flags: 64 } })
    return
  }

  const { teamName, members } = await getTeamMembers(user.teamId)

  if (!members.length) {
    res.json({ type: 4, data: { content: `No members found in **${teamName}**.`, flags: 64 } })
    return
  }

  const lines = members.map((m: TeamMemberView) => {
    const status = m.status === 'ACTIVE' ? '🟢' : '🔴'
    return `${status} **${m.name}** — WFH this month: ${m.wfhCount}`
  })

  const content = `👥 **${teamName}** *(${members.length} member${members.length === 1 ? '' : 's'}) — ${month}*\n\n${lines.join('\n')}`
  res.json({ type: 4, data: { content, flags: 64 } })
}

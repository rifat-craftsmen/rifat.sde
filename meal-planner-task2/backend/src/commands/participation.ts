import { Response } from 'express'
import { AuthRequest } from '../types/index.js'
import { getParticipation } from '../services/participationService.js'

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

export async function handleParticipation(req: AuthRequest, res: Response): Promise<void> {
  const role = req.user!.role
  if (role !== 'ADMIN' && role !== 'LEAD') {
    res.json({ type: 4, data: { content: 'Only admins and leads can view participation.', flags: 64 } })
    return
  }

  let date: string
  if (req.user!.platform === 'google') {
    date = (req.body?.message?.argumentText as string ?? '').trim()
  } else {
    const options: Array<{ name: string; value: string }> = req.body.data?.options ?? []
    date = options.find(o => o.name === 'date')?.value ?? ''
  }

  if (!DATE_RE.test(date)) {
    res.json({ type: 4, data: { content: 'Invalid date format. Use YYYY-MM-DD.', flags: 64 } })
    return
  }

  // LEAD is scoped to their own team; ADMIN sees all
  const teamId = role === 'LEAD' ? req.user!.teamId : undefined

  const data = await getParticipation(date, teamId)

  if (data.employees.length === 0) {
    res.json({ type: 4, data: { content: `No participation data found for **${date}**.`, flags: 64 } })
    return
  }

  const scopeLabel = role === 'LEAD' ? ' *(your team)*' : ''
  const header     = `👥 **Participation — ${date}**${scopeLabel}\n`

  const lines = data.employees.map(e => {
    const wfh  = e.workFromHome ? '🏠' : '🏢'
    const meals = [
      e.meals.lunch          === true  ? 'L:✅' : e.meals.lunch          === false ? 'L:❌' : '',
      e.meals.snacks         === true  ? 'S:✅' : e.meals.snacks         === false ? 'S:❌' : '',
      e.meals.iftar          === true  ? 'I:✅' : e.meals.iftar          === false ? 'I:❌' : '',
      e.meals.eventDinner    === true  ? 'ED:✅': e.meals.eventDinner    === false ? 'ED:❌': '',
      e.meals.optionalDinner === true  ? 'OD:✅': e.meals.optionalDinner === false ? 'OD:❌': '',
    ].filter(Boolean).join('  ') || '—'

    const team = e.teamName ? ` *[${e.teamName}]*` : ''
    return `${wfh} **${e.name}**${team} — ${meals}  WFH/mo: ${e.wfhCount}`
  })

  res.json({
    type: 4,
    data: {
      content: header + lines.join('\n'),
      flags: 64,
    },
  })
}

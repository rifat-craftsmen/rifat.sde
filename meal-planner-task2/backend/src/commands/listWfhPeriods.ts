import { Response } from 'express'
import { AuthRequest } from '../types/index.js'
import { listWfhPeriods } from '../services/wfhService.js'

export async function handleListWfhPeriods(req: AuthRequest, res: Response): Promise<void> {
  if (req.user!.role !== 'ADMIN') {
    res.json({ type: 4, data: { content: 'Only admins can view WFH periods.', flags: 64 } })
    return
  }

  const periods = await listWfhPeriods()

  if (periods.length === 0) {
    res.json({ type: 4, data: { content: 'No WFH periods found.', flags: 64 } })
    return
  }

  const lines = periods.map(p => {
    const note = p.note ? ` — *${p.note}*` : ''
    return `**${p.dateFrom}** → **${p.dateTo}**${note}  \`id: ${p.id}\``
  })

  res.json({
    type: 4,
    data: {
      content: `**WFH Periods:**\n${lines.join('\n')}`,
      flags: 64,
    },
  })
}
